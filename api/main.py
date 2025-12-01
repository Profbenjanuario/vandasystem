# api/main.py
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
import httpx
import jwt

app = FastAPI(title="Stunner System API")
# Adicione esta rota no seu main.py
@app.get("/")
async def health_check():
    return {"status": "online", "service": "Stunner System API"}
# CORS — permite requisições do GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, troque por ["https://seu-usuario.github.io"]
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

@app.post("/api/sale")
async def create_sale(sale: SaleRequest, request: Request):
    # Pega headers
    auth_header = request.headers.get("authorization")
    supabase_url = request.headers.get("x-supabase-url")
    supabase_key = request.headers.get("x-supabase-key")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=400, detail="Configuração do cliente ausente")

    token = auth_header.split(" ")[1]
    try:
        # Decodifica o JWT (use a JWT_SECRET do Supabase do cliente)
        decoded = jwt.decode(token, options={"verify_signature": False})  # Simples: confia no token
        user_id = decoded["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        total_amount = 0.0
        validated_items = []

        # Valida cada item
        for item in sale.items:
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail="Quantidade inválida")

            prod_resp = await client.get(
                f"{supabase_url}/rest/v1/products?id=eq.{item.product_id}",
                headers=headers
            )
            if prod_resp.status_code != 200 or not prod_resp.json():
                raise HTTPException(status_code=404, detail=f"Produto não encontrado")

            product = prod_resp.json()[0]
            if item.quantity > product["stock_quantity"]:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product['name']}")

            subtotal = product["price"] * item.quantity
            total_amount += subtotal
            validated_items.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": product["price"],
                "subtotal": subtotal
            })

        final_total = max(0.0, total_amount - sale.global_discount)

        # Registra venda
        sale_resp = await client.post(
            f"{supabase_url}/rest/v1/sales",
            json={
                "user_id": user_id,
                "total_amount": final_total,
                "global_discount": sale.global_discount,
                "created_at": datetime.utcnow().isoformat()
            },
            headers=headers
        )
        if sale_resp.status_code != 201:
            raise HTTPException(status_code=500, detail="Erro ao registrar venda")
        sale_id = sale_resp.json()[0]["id"]

        # Registra itens e atualiza stock
        for item in validated_items:
            await client.post(
                f"{supabase_url}/rest/v1/sale_items",
                json={**item, "sale_id": sale_id},
                headers=headers
            )
            await client.patch(
                f"{supabase_url}/rest/v1/products?id=eq.{item['product_id']}",
                json={"stock_quantity": f"stock_quantity - {item['quantity']}"},
                headers=headers
            )

        return {"sale_id": sale_id, "message": "Venda confirmada"}
