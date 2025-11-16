// ========== CONFIGURAÇÕES SUPABASE ==========
// ⚠️ SUBSTITUA COM SUAS CREDENCIAIS REAIS ⚠️
const SUPABASE_URL = 'https://dwmtpbxdujfevuleqlaa.supabase.co';
const SUPABASE_ANON_KEY =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bXRwYnhkdWpmZXZ1bGVxbGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzE3MjQsImV4cCI6MjA3ODgwNzcyNH0.YGgp2ynQhf155O1tEJvs9l8jLkby2L2i6qxX71gdFyQ';

// ========== VARIÁVEIS GLOBAIS ==========
let supabase;
let produtos = [];
let vendas = [];
let configuracoes = {};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    inicializarSupabase();
    carregarPagina('resumo');
});

function inicializarSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase inicializado');
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        mostrarMensagem('Erro ao conectar com o banco de dados', 'danger');
    }
}

// ========== NAVEGAÇÃO SIMPLIFICADA ==========
function navegarPara(pagina) {
    // Atualizar menu ativo
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Encontrar e ativar o link correto
    const linkAtivo = document.querySelector(`[onclick*="${pagina}"]`);
    if (linkAtivo) {
        linkAtivo.classList.add('active');
    }
    
    carregarPagina(pagina);
}

async function carregarPagina(pagina) {
    try {
        console.log(`📄 Carregando página: ${pagina}`);
        const response = await fetch(`${pagina}.html`);
        
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        
        const html = await response.text();
        document.getElementById('conteudo').innerHTML = html;
        
        await carregarDadosIniciais();
        
        switch(pagina) {
            case 'resumo': await carregarResumo(); break;
            case 'vendas': await carregarVendas(); break;
            case 'nova-venda': await carregarNovaVenda(); break;
            case 'produtos': await carregarProdutos(); break;
            case 'relatorio': await carregarRelatorio(); break;
            case 'configuracoes': await carregarConfiguracoes(); break;
        }
        
    } catch (error) {
        console.error(`Erro ao carregar página ${pagina}:`, error);
        mostrarMensagem('Erro ao carregar página', 'danger');
    }
}

// ========== FUNÇÕES SUPABASE ==========
async function getDataFromTable(tableName) {
    try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error(`Erro ao buscar ${tableName}:`, error);
        return [];
    }
}

async function insertData(tableName, data) {
    try {
        const { data: result, error } = await supabase
            .from(tableName)
            .insert([data])
            .select();
        if (error) throw error;
        return result ? result[0] : null;
    } catch (error) {
        console.error(`Erro ao inserir em ${tableName}:`, error);
        return null;
    }
}

async function updateData(tableName, id, data) {
    try {
        const { data: result, error } = await supabase
            .from(tableName)
            .update(data)
            .eq('id', id)
            .select();
        if (error) throw error;
        return result ? result[0] : null;
    } catch (error) {
        console.error(`Erro ao atualizar ${tableName}:`, error);
        return null;
    }
}

async function deleteData(tableName, id) {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error(`Erro ao deletar ${tableName}:`, error);
        return false;
    }
}

// ========== FUNÇÕES ESPECÍFICAS ==========
async function getProdutos() { return await getDataFromTable('produtos'); }
async function getVendas() { return await getDataFromTable('vendas'); }
async function getConfiguracoes() {
    const configs = await getDataFromTable('configuracoes');
    return configs.length > 0 ? configs[0] : {};
}

async function salvarProduto(produto) {
    return await insertData('produtos', {
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        preco: parseFloat(produto.preco),
        estoque: parseInt(produto.estoque),
        created_at: new Date().toISOString()
    });
}

async function salvarVenda(venda) {
    const numeroVenda = await getProximoNumeroVenda();
    return await insertData('vendas', {
        numero: numeroVenda,
        cliente: venda.cliente,
        produtos: JSON.stringify(venda.produtos),
        total: parseFloat(venda.total),
        forma_pagamento: venda.formaPagamento,
        observacoes: venda.observacoes,
        data: new Date().toISOString()
    });
}

async function salvarConfiguracoes(config) {
    const configExistente = await getConfiguracoes();
    if (configExistente && configExistente.id) {
        return await updateData('configuracoes', configExistente.id, config);
    } else {
        return await insertData('configuracoes', config);
    }
}

async function getProximoNumeroVenda() {
    const vendas = await getVendas();
    return vendas.length > 0 ? Math.max(...vendas.map(v => v.numero || 0)) + 1 : 1;
}

// ========== CARREGAR DADOS ==========
async function carregarDadosIniciais() {
    try {
        [produtos, vendas, configuracoes] = await Promise.all([
            getProdutos(),
            getVendas(),
            getConfiguracoes()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// ========== FUNÇÕES DAS PÁGINAS ==========
async function carregarResumo() {
    const totalVendas = vendas.length;
    const totalValor = vendas.reduce((sum, v) => sum + (v.total || 0), 0);
    
    document.getElementById('total-vendas').textContent = totalVendas;
    document.getElementById('total-valor').textContent = formatarMoeda(totalValor);
    document.getElementById('venda-media').textContent = formatarMoeda(totalVendas > 0 ? totalValor / totalVendas : 0);
}

async function carregarVendas() {
    let html = '';
    vendas.forEach(venda => {
        html += `
            <tr>
                <td>#${venda.numero}</td>
                <td>${formatarData(venda.data)}</td>
                <td>${venda.cliente || 'Não informado'}</td>
                <td>${formatarMoeda(venda.total)}</td>
                <td>${venda.forma_pagamento || 'Não informada'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="gerarRecibo(${venda.numero})">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    document.getElementById('lista-vendas').innerHTML = html || '<tr><td colspan="6" class="text-center">Nenhuma venda</td></tr>';
}

// ========== FUNÇÕES UTILITÁRIAS ==========
function mostrarMensagem(mensagem, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.innerHTML = `${mensagem}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.querySelector('.content').insertBefore(alerta, document.querySelector('.content').firstChild);
    setTimeout(() => alerta.remove(), 5000);
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(dataString) {
    return new Date(dataString).toLocaleDateString('pt-BR');
}

// Adicione as outras funções específicas das páginas conforme necessário...
