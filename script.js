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
    navegarPara('resumo');
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
    console.log(`🎯 Navegando para: ${pagina}`);
    carregarPagina(pagina);
}

async function carregarPagina(pagina) {
    try {
        console.log(`📄 Buscando arquivo: ${pagina}.html`);
        
        const response = await fetch(`${pagina}.html`);
        console.log('📋 Status da resposta:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Arquivo não encontrado: ${pagina}.html (Status: ${response.status})`);
        }
        
        const html = await response.text();
        console.log('✅ HTML carregado com sucesso');
        
        // Atualizar conteúdo
        document.getElementById('conteudo').innerHTML = html;
        
        // Atualizar menu ativo
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Encontrar o link correto e ativar
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            if (link.getAttribute('onclick')?.includes(pagina)) {
                link.classList.add('active');
            }
        });
        
        // Carregar dados
        await carregarDadosIniciais();
        console.log('✅ Dados carregados');
        
        // Carregar página específica
        switch(pagina) {
            case 'resumo': 
                await carregarResumo(); 
                break;
            case 'vendas': 
                await carregarVendas(); 
                break;
            case 'nova-venda': 
                await carregarNovaVenda(); 
                break;
            case 'produtos': 
                await carregarProdutos(); 
                break;
            case 'relatorio': 
                await carregarRelatorio(); 
                break;
            case 'configuracoes': 
                await carregarConfiguracoes(); 
                break;
            default:
                console.warn('Página não reconhecida:', pagina);
        }
        
        console.log(`✅ Página ${pagina} carregada com sucesso`);
        
    } catch (error) {
        console.error(`❌ Erro ao carregar página ${pagina}:`, error);
        
        // Mostrar erro detalhado no conteúdo
        document.getElementById('conteudo').innerHTML = `
            <div class="alert alert-danger">
                <h4>Erro ao carregar página</h4>
                <p><strong>Página:</strong> ${pagina}.html</p>
                <p><strong>Erro:</strong> ${error.message}</p>
                <p><strong>Verifique:</strong></p>
                <ul>
                    <li>O arquivo ${pagina}.html existe na mesma pasta</li>
                    <li>O servidor está rodando corretamente</li>
                    <li>Não há erros de CORS</li>
                </ul>
                <button class="btn btn-primary" onclick="navegarPara('resumo')">
                    Voltar para o Resumo
                </button>
            </div>
        `;
    }
}

// ========== FUNÇÕES SUPABASE ==========
async function getDataFromTable(tableName) {
    try {
        console.log(`📊 Buscando: ${tableName}`);
        const { data, error } = await supabase.from(tableName).select('*');
        
        if (error) {
            console.error(`❌ Erro Supabase ${tableName}:`, error);
            throw error;
        }
        
        console.log(`✅ ${tableName} carregados:`, data?.length || 0);
        return data || [];
    } catch (error) {
        console.error(`❌ Erro ao buscar ${tableName}:`, error);
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
        console.log('🔄 Carregando dados iniciais...');
        [produtos, vendas, configuracoes] = await Promise.all([
            getProdutos(),
            getVendas(),
            getConfiguracoes()
        ]);
        console.log('✅ Dados carregados:', {
            produtos: produtos.length,
            vendas: vendas.length,
            configuracoes: Object.keys(configuracoes).length
        });
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}

// ========== PÁGINA RESUMO ==========
async function carregarResumo() {
    try {
        console.log('📈 Carregando resumo...');
        const totalVendas = vendas.length;
        const totalValor = vendas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
        const vendaMedia = totalVendas > 0 ? totalValor / totalVendas : 0;

        document.getElementById('total-vendas').textContent = totalVendas;
        document.getElementById('total-valor').textContent = formatarMoeda(totalValor);
        document.getElementById('venda-media').textContent = formatarMoeda(vendaMedia);
        
        console.log('✅ Resumo carregado');
    } catch (error) {
        console.error('❌ Erro no resumo:', error);
    }
}

// ========== PÁGINA VENDAS ==========
async function carregarVendas() {
    try {
        console.log('🛒 Carregando vendas...');
        let html = '';
        
        if (vendas.length === 0) {
            html = '<tr><td colspan="6" class="text-center text-muted">Nenhuma venda encontrada</td></tr>';
        } else {
            vendas.forEach(venda => {
                html += `
                    <tr>
                        <td>#${venda.numero}</td>
                        <td>${formatarData(venda.data)}</td>
                        <td>${venda.cliente || 'Não informado'}</td>
                        <td>${formatarMoeda(venda.total)}</td>
                        <td>${venda.forma_pagamento || 'Não informada'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-receipt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
        
        document.getElementById('lista-vendas').innerHTML = html;
        console.log('✅ Vendas carregadas:', vendas.length);
    } catch (error) {
        console.error('❌ Erro ao carregar vendas:', error);
    }
}

// ========== PÁGINA NOVA VENDA ==========
async function carregarNovaVenda() {
    try {
        console.log('➕ Carregando nova venda...');
        // Implementação básica para teste
        document.getElementById('numero-venda').textContent = await getProximoNumeroVenda();
        console.log('✅ Nova venda carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar nova venda:', error);
    }
}

// ========== PÁGINA PRODUTOS ==========
async function carregarProdutos() {
    try {
        console.log('📦 Carregando produtos...');
        let html = '';
        
        if (produtos.length === 0) {
            html = '<tr><td colspan="5" class="text-center text-muted">Nenhum produto cadastrado</td></tr>';
        } else {
            produtos.forEach(produto => {
                html += `
                    <tr>
                        <td>${produto.nome}</td>
                        <td>${produto.descricao || '-'}</td>
                        <td>${produto.categoria || '-'}</td>
                        <td>${formatarMoeda(produto.preco)}</td>
                        <td>${produto.estoque}</td>
                    </tr>
                `;
            });
        }
        
        document.getElementById('lista-produtos').innerHTML = html;
        console.log('✅ Produtos carregados:', produtos.length);
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
    }
}

// ========== PÁGINA RELATÓRIOS ==========
async function carregarRelatorio() {
    try {
        console.log('📊 Carregando relatórios...');
        // Data padrão: primeiro dia do mês até hoje
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        document.getElementById('data-inicio').value = formatarDataInput(primeiroDia);
        document.getElementById('data-fim').value = formatarDataInput(hoje);
        console.log('✅ Relatórios carregados');
    } catch (error) {
        console.error('❌ Erro ao carregar relatórios:', error);
    }
}

// ========== PÁGINA CONFIGURAÇÕES ==========
async function carregarConfiguracoes() {
    try {
        console.log('⚙️ Carregando configurações...');
        if (configuracoes) {
            document.getElementById('nome-empresa').value = configuracoes.nome_empresa || '';
            document.getElementById('email').value = configuracoes.email || '';
            document.getElementById('telefone').value = configuracoes.telefone || '';
        }
        console.log('✅ Configurações carregadas');
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
    }
}

// ========== FUNÇÕES UTILITÁRIAS ==========
function mostrarMensagem(mensagem, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(alerta, content.firstChild);
        setTimeout(() => alerta.remove(), 5000);
    }
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(dataString) {
    try {
        return new Date(dataString).toLocaleDateString('pt-BR');
    } catch {
        return 'Data inválida';
    }
}

function formatarDataInput(data) {
    return data.toISOString().split('T')[0];
}