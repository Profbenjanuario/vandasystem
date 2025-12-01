# api/main.py
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
import httpx
import jwt  # para decodificar o JWT e obter o user_id

# Configuração
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://SEU_PROJETO.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "SUA_SERVICE_ROLE_KEY_AQUI")
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "SUA_JWT_SECRET_AQUI")  # Opcional, mas recomendado

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

app = FastAPI(title="Stunner System API")

# CORS (ajuste em produção)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SaleItem(BaseModel):
    product_id: int
    quantity: int

class SaleRequest(BaseModel):
    items: List[SaleItem]
    global_discount: float = 0.0

def extract_user_id(authorization: str) -> str:
    """Extrai user_id do token JWT enviado pelo front-end."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente")
    
    token = authorization.split(" ")[1]
    try:
        # Decodifica o JWT (usa a JWT_SECRET do Supabase, encontrada em Settings > API)
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return decoded["sub"]  # "sub" contém o user_id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido")

@app.post("/api/sale")
async def create_sale(sale: SaleRequest, request: Request):
    # Extrai user_id do cabeçalho Authorization
    auth_header = request.headers.get("authorization")
    user_id = extract_user_id(auth_header)

    async with httpx.AsyncClient() as client:
        total_amount = 0.0
        sale_items_data = []

        # 1. Validar e coletar dados de cada item
        for item in sale.items:
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero.")

            # Buscar produto real
            prod_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{item.product_id}",
                headers=headers
            )
            if prod_resp.status_code != 200 or not prod_resp.json():
                raise HTTPException(status_code=404, detail=f"Produto ID {item.product_id} não encontrado.")
            
            product = prod_resp.json()[0]
            stock = product["stock_quantity"]
            price = product["price"]

            if item.quantity > stock:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product['name']}.")

            subtotal = price * item.quantity
            total_amount += subtotal

            sale_items_data.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": price,
                "subtotal": subtotal
            })

        # 2. Aplicar desconto geral
        final_total = max(0.0, total_amount - sale.global_discount)

        # 3. Inserir cabeçalho da venda com user_id
        sale_header = {
            "user_id": user_id,  # ✅ REGISTRA O VENDEDOR
            "total_amount": final_total,
            "global_discount": sale.global_discount,
            "created_at": datetime.utcnow().isoformat()
        }

        sale_resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/sales",
            json=sale_header,
            headers=headers
        )
        if sale_resp.status_code != 201:
            raise HTTPException(status_code=500, detail="Falha ao criar venda.")

        sale_id = sale_resp.json()[0]["id"]

        # 4. Inserir itens e atualizar stock (não é transação atômica, mas é o melhor com Supabase)
        for item_data in sale_items_data:
            # Inserir item
            await client.post(
                f"{SUPABASE_URL}/rest/v1/sale_items",
                json={
                    "sale_id": sale_id,
                    "product_id": item_data["product_id"],
                    "quantity": item_data["quantity"],
                    "unit_price": item_data["unit_price"],
                    "subtotal": item_data["subtotal"]
                },
                headers=headers
            )

            # Atualizar stock
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{item_data['product_id']}",
                json={"stock_quantity": f"stock_quantity - {item_data['quantity']}"},
                headers=headers
            )

        return {"message": "Venda confirmada com sucesso", "sale_id": sale_id}
