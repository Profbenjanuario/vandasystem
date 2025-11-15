// ATUALIZE ESTES VALORES COM SUAS CREDENCIAIS DO SUPABASE
const SUPABASE_URL = 'https://unwhdctlggclczeqgpfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVud2hkY3RsZ2djbGN6ZXFncGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjQyODcsImV4cCI6MjA3ODgwMDI4N30.i4x3bxLcjxfJtCB8pQVUqJIf7qGPz_qBgYV_jVxhhjQ';

// Variáveis globais
let produtos = [];
let vendas = [];
let configuracoes = {};
let supabase;

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    inicializarSupabase();
    carregarPagina('resumo');
});

// Inicializar Supabase
function inicializarSupabase() {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Função para carregar páginas
async function carregarPagina(pagina) {
    try {
        const response = await fetch(`${pagina}.html`);
        const html = await response.text();
        document.getElementById('conteudo').innerHTML = html;
        
        // Atualizar menu ativo
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Executar scripts específicos da página
        await carregarDadosIniciais();
        
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
        }
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        mostrarMensagem('Erro ao carregar página', 'danger');
    }
}

// Carregar dados iniciais
async function carregarDadosIniciais() {
    try {
        produtos = await getProdutos();
        vendas = await getVendas();
        configuracoes = await getConfiguracoes();
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        mostrarMensagem('Erro ao conectar com o banco de dados. Verifique as configurações do Supabase.', 'danger');
    }
}

// Função para mostrar mensagens
function mostrarMensagem(mensagem, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const content = document.querySelector('.content');
    const primeiroFilho = content.firstChild;
    content.insertBefore(alerta, primeiroFilho);
    
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

// ========== FUNÇÕES DO SUPABASE ==========

async function getDataFromTable(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
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
        console.error('Erro ao inserir dados:', error);
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
        console.error('Erro ao atualizar dados:', error);
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
        console.error('Erro ao deletar dados:', error);
        return false;
    }
}

// Funções específicas para produtos
async function getProdutos() {
    return await getDataFromTable('produtos');
}

async function salvarProduto(produto) {
    return await insertData('produtos', {
        nome: produto.nome,
        preco: produto.preco,
        estoque: produto.estoque,
        categoria: produto.categoria,
        descricao: produto.descricao,
        created_at: new Date().toISOString()
    });
}

async function atualizarProduto(id, produto) {
    return await updateData('produtos', id, {
        nome: produto.nome,
        preco: produto.preco,
        estoque: produto.estoque,
        categoria: produto.categoria,
        descricao: produto.descricao,
        updated_at: new Date().toISOString()
    });
}

async function excluirProduto(id) {
    return await deleteData('produtos', id);
}

// Funções específicas para vendas
async function getVendas() {
    const vendas = await getDataFromTable('vendas');
    return vendas.map(venda => ({
        ...venda,
        data: venda.data || venda.created_at
    }));
}

async function salvarVenda(venda) {
    const numeroVenda = await getProximoNumeroVenda();
    
    return await insertData('vendas', {
        numero: numeroVenda,
        cliente: venda.cliente,
        produtos: JSON.stringify(venda.produtos),
        total: venda.total,
        forma_pagamento: venda.formaPagamento,
        observacoes: venda.observacoes,
        data: new Date().toISOString(),
        created_at: new Date().toISOString()
    });
}

// Funções para relatórios
async function getResumoVendas() {
    try {
        const vendas = await getVendas();
        
        const totalVendas = vendas.length;
        const totalValor = vendas.reduce((sum, venda) => sum + (parseFloat(venda.total) || 0), 0);
        const vendaMedia = totalVendas > 0 ? totalValor / totalVendas : 0;
        
        // Vendas do mês atual
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        const vendasMes = vendas.filter(venda => {
            const dataVenda = new Date(venda.data);
            return dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual;
        });
        const totalMes = vendasMes.reduce((sum, venda) => sum + (parseFloat(venda.total) || 0), 0);
        
        return {
            totalVendas,
            totalValor,
            vendaMedia,
            totalMes,
            vendasMes: vendasMes.length
        };
    } catch (error) {
        console.error('Erro ao calcular resumo:', error);
        return { totalVendas: 0, totalValor: 0, vendaMedia: 0, totalMes: 0, vendasMes: 0 };
    }
}

// Função para buscar configurações
async function getConfiguracoes() {
    const configuracoes = await getDataFromTable('configuracoes');
    return configuracoes.length > 0 ? configuracoes[0] : {};
}

// Função para salvar configurações
async function salvarConfiguracoes(config) {
    const configExistente = await getConfiguracoes();
    
    if (configExistente && configExistente.id) {
        return await updateData('configuracoes', configExistente.id, {
            ...config,
            updated_at: new Date().toISOString()
        });
    } else {
        return await insertData('configuracoes', {
            ...config,
            created_at: new Date().toISOString()
        });
    }
}

// Função para gerar próximo número de venda
async function getProximoNumeroVenda() {
    try {
        const vendas = await getVendas();
        if (vendas.length > 0) {
            const ultimoNumero = Math.max(...vendas.map(v => v.numero || 0));
            return ultimoNumero + 1;
        }
        return 1;
    } catch (error) {
        console.error('Erro ao buscar próximo número:', error);
        return 1;
    }
}

// Função para buscar vendas por período
async function getVendasPorPeriodo(dataInicio, dataFim) {
    try {
        const { data, error } = await supabase
            .from('vendas')
            .select('*')
            .gte('data', dataInicio)
            .lte('data', dataFim);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar vendas por período:', error);
        return [];
    }
}

// Função para buscar produtos mais vendidos
async function getProdutosMaisVendidos(limite = 10) {
    try {
        const vendas = await getVendas();
        const produtosVendidos = {};
        
        vendas.forEach(venda => {
            if (venda.produtos) {
                const produtos = typeof venda.produtos === 'string' ? JSON.parse(venda.produtos) : venda.produtos;
                produtos.forEach(prod => {
                    if (produtosVendidos[prod.id]) {
                        produtosVendidos[prod.id].quantidade += prod.quantidade;
                        produtosVendidos[prod.id].total += prod.preco * prod.quantidade;
                    } else {
                        produtosVendidos[prod.id] = {
                            nome: prod.nome,
                            quantidade: prod.quantidade,
                            total: prod.preco * prod.quantidade
                        };
                    }
                });
            }
        });
        
        return Object.entries(produtosVendidos)
            .map(([id, dados]) => ({ id, ...dados }))
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, limite);
    } catch (error) {
        console.error('Erro ao buscar produtos mais vendidos:', error);
        return [];
    }
}

// ========== FUNÇÕES DAS PÁGINAS ==========

// Página de Resumo
async function carregarResumo() {
    const resumo = await getResumoVendas();
    
    document.getElementById('total-vendas').textContent = resumo.totalVendas;
    document.getElementById('total-valor').textContent = formatarMoeda(resumo.totalValor);
    document.getElementById('venda-media').textContent = formatarMoeda(resumo.vendaMedia);
    document.getElementById('vendas-mes').textContent = resumo.vendasMes;
    document.getElementById('total-mes').textContent = formatarMoeda(resumo.totalMes);
    
    // Gráfico simples de vendas recentes
    const vendasRecentes = vendas.slice(-10).reverse();
    let htmlVendasRecentes = '';
    vendasRecentes.forEach(venda => {
        htmlVendasRecentes += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">Venda #${venda.numero}</h6>
                    <small>${formatarData(venda.data)}</small>
                </div>
                <p class="mb-1">${venda.cliente || 'Cliente não informado'}</p>
                <small class="text-success">${formatarMoeda(venda.total)}</small>
            </div>
        `;
    });
    
    document.getElementById('vendas-recentes').innerHTML = htmlVendasRecentes || '<div class="text-center p-3">Nenhuma venda recente</div>';
}

// Página de Vendas
async function carregarVendas() {
    let html = '';
    vendas.forEach(venda => {
        const produtosVenda = typeof venda.produtos === 'string' ? JSON.parse(venda.produtos) : venda.produtos;
        const listaProdutos = produtosVenda.map(p => `${p.quantidade}x ${p.nome}`).join(', ');
        
        html += `
            <tr>
                <td>#${venda.numero}</td>
                <td>${formatarData(venda.data)}</td>
                <td>${venda.cliente || 'Não informado'}</td>
                <td>${listaProdutos}</td>
                <td>${venda.forma_pagamento || 'Não informada'}</td>
                <td class="fw-bold text-success">${formatarMoeda(venda.total)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="gerarRecibo(${venda.numero})">
                        <i class="fas fa-receipt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirVenda(${venda.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('lista-vendas').innerHTML = html || '<tr><td colspan="7" class="text-center">Nenhuma venda encontrada</td></tr>';
}

async function excluirVenda(id) {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
        const sucesso = await deleteData('vendas', id);
        if (sucesso) {
            mostrarMensagem('Venda excluída com sucesso!', 'success');
            await carregarDadosIniciais();
            carregarVendas();
        } else {
            mostrarMensagem('Erro ao excluir venda', 'danger');
        }
    }
}

// Página Nova Venda
async function carregarNovaVenda() {
    // Preencher select de produtos
    const selectProduto = document.getElementById('produto');
    selectProduto.innerHTML = '<option value="">Selecione um produto</option>';
    
    produtos.forEach(produto => {
        if (produto.estoque > 0) {
            selectProduto.innerHTML += `
                <option value="${produto.id}" data-preco="${produto.preco}" data-estoque="${produto.estoque}">
                    ${produto.nome} - ${formatarMoeda(produto.preco)} (Estoque: ${produto.estoque})
                </option>
            `;
        }
    });
    
    // Limpar carrinho
    document.getElementById('carrinho').innerHTML = '';
    document.getElementById('total-venda').textContent = 'R$ 0,00';
    
    // Gerar número da venda
    const numeroVenda = await getProximoNumeroVenda();
    document.getElementById('numero-venda').textContent = numeroVenda;
}

function adicionarProduto() {
    const selectProduto = document.getElementById('produto');
    const quantidadeInput = document.getElementById('quantidade');
    const produtoId = selectProduto.value;
    const quantidade = parseInt(quantidadeInput.value) || 1;
    
    if (!produtoId) {
        mostrarMensagem('Selecione um produto', 'warning');
        return;
    }
    
    const option = selectProduto.options[selectProduto.selectedIndex];
    const produtoNome = option.text.split(' - ')[0];
    const preco = parseFloat(option.getAttribute('data-preco'));
    const estoque = parseInt(option.getAttribute('data-estoque'));
    
    if (quantidade > estoque) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${estoque}`, 'warning');
        return;
    }
    
    const carrinho = document.getElementById('carrinho');
    const itemId = `prod-${produtoId}-${Date.now()}`;
    
    const itemHTML = `
        <div class="list-group-item" id="${itemId}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${produtoNome}</h6>
                    <small>${quantidade} x ${formatarMoeda(preco)} = ${formatarMoeda(preco * quantidade)}</small>
                </div>
                <button class="btn btn-sm btn-danger" onclick="removerProduto('${itemId}', ${preco * quantidade})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    carrinho.innerHTML += itemHTML;
    
    // Atualizar total
    const totalAtual = parseFloat(document.getElementById('total-venda').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
    const novoTotal = totalAtual + (preco * quantidade);
    document.getElementById('total-venda').textContent = formatarMoeda(novoTotal);
    
    // Limpar campos
    selectProduto.value = '';
    quantidadeInput.value = '1';
}

function removerProduto(itemId, valor) {
    const item = document.getElementById(itemId);
    if (item) {
        item.remove();
        
        // Atualizar total
        const totalAtual = parseFloat(document.getElementById('total-venda').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
        const novoTotal = totalAtual - valor;
        document.getElementById('total-venda').textContent = formatarMoeda(novoTotal);
    }
}

async function finalizarVenda() {
    const carrinho = document.getElementById('carrinho');
    const itens = carrinho.querySelectorAll('.list-group-item');
    
    if (itens.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho antes de finalizar a venda', 'warning');
        return;
    }
    
    const cliente = document.getElementById('cliente').value;
    const formaPagamento = document.getElementById('forma-pagamento').value;
    const observacoes = document.getElementById('observacoes').value;
    const total = parseFloat(document.getElementById('total-venda').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
    
    // Coletar produtos do carrinho
    const produtosVenda = [];
    itens.forEach(item => {
        const texto = item.querySelector('h6').textContent;
        const precoTexto = item.querySelector('small').textContent;
        const [quantidade, resto] = precoTexto.split(' x ');
        const preco = parseFloat(resto.split(' = ')[0].replace('R$ ', '').replace('.', '').replace(',', '.'));
        
        produtosVenda.push({
            nome: texto,
            preco: preco,
            quantidade: parseInt(quantidade),
            total: preco * parseInt(quantidade)
        });
    });
    
    const venda = {
        cliente: cliente,
        produtos: produtosVenda,
        total: total,
        formaPagamento: formaPagamento,
        observacoes: observacoes
    };
    
    const resultado = await salvarVenda(venda);
    if (resultado) {
        mostrarMensagem('Venda realizada com sucesso!', 'success');
        
        // Atualizar estoque dos produtos
        for (const produto of produtosVenda) {
            const produtoOriginal = produtos.find(p => p.nome === produto.nome);
            if (produtoOriginal) {
                await atualizarProduto(produtoOriginal.id, {
                    ...produtoOriginal,
                    estoque: produtoOriginal.estoque - produto.quantidade
                });
            }
        }
        
        // Limpar formulário
        document.getElementById('form-venda').reset();
        document.getElementById('carrinho').innerHTML = '';
        document.getElementById('total-venda').textContent = 'R$ 0,00';
        
        // Recarregar dados
        await carregarDadosIniciais();
        
        // Gerar recibo
        gerarRecibo(resultado.numero);
    } else {
        mostrarMensagem('Erro ao realizar venda', 'danger');
    }
}

// Página de Produtos
async function carregarProdutos() {
    let html = '';
    produtos.forEach(produto => {
        html += `
            <tr>
                <td>${produto.nome}</td>
                <td>${produto.descricao || '-'}</td>
                <td>${produto.categoria || '-'}</td>
                <td>${formatarMoeda(produto.preco)}</td>
                <td>${produto.estoque}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarProduto(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('lista-produtos').innerHTML = html || '<tr><td colspan="6" class="text-center">Nenhum produto cadastrado</td></tr>';
}

function mostrarFormProduto() {
    document.getElementById('form-produto-container').classList.remove('d-none');
    document.getElementById('btn-novo-produto').classList.add('d-none');
    document.getElementById('form-produto').reset();
    document.getElementById('produto-id').value = '';
}

function cancelarFormProduto() {
    document.getElementById('form-produto-container').classList.add('d-none');
    document.getElementById('btn-novo-produto').classList.remove('d-none');
}

async function salvarProdutoForm() {
    const form = document.getElementById('form-produto');
    const formData = new FormData(form);
    
    const produto = {
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        categoria: formData.get('categoria'),
        preco: parseFloat(formData.get('preco')),
        estoque: parseInt(formData.get('estoque'))
    };
    
    const produtoId = document.getElementById('produto-id').value;
    let resultado;
    
    if (produtoId) {
        resultado = await atualizarProduto(produtoId, produto);
    } else {
        resultado = await salvarProduto(produto);
    }
    
    if (resultado) {
        mostrarMensagem(`Produto ${produtoId ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
        cancelarFormProduto();
        await carregarDadosIniciais();
        carregarProdutos();
    } else {
        mostrarMensagem('Erro ao salvar produto', 'danger');
    }
}

async function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto) {
        document.getElementById('produto-id').value = produto.id;
        document.getElementById('nome').value = produto.nome;
        document.getElementById('descricao').value = produto.descricao || '';
        document.getElementById('categoria').value = produto.categoria || '';
        document.getElementById('preco').value = produto.preco;
        document.getElementById('estoque').value = produto.estoque;
        
        mostrarFormProduto();
    }
}

async function excluirProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        const sucesso = await excluirProduto(id);
        if (sucesso) {
            mostrarMensagem('Produto excluído com sucesso!', 'success');
            await carregarDadosIniciais();
            carregarProdutos();
        } else {
            mostrarMensagem('Erro ao excluir produto', 'danger');
        }
    }
}

// Página de Relatórios
async function carregarRelatorio() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    document.getElementById('data-inicio').value = formatarDataInput(primeiroDiaMes);
    document.getElementById('data-fim').value = formatarDataInput(hoje);
    
    await gerarRelatorio();
}

async function gerarRelatorio() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    
    if (!dataInicio || !dataFim) {
        mostrarMensagem('Selecione o período do relatório', 'warning');
        return;
    }
    
    const vendasPeriodo = await getVendasPorPeriodo(dataInicio, dataFim);
    const produtosMaisVendidos = await getProdutosMaisVendidos(5);
    
    // Estatísticas do período
    const totalVendas = vendasPeriodo.length;
    const totalValor = vendasPeriodo.reduce((sum, venda) => sum + (parseFloat(venda.total) || 0), 0);
    const vendaMedia = totalVendas > 0 ? totalValor / totalVendas : 0;
    
    document.getElementById('relatorio-total-vendas').textContent = totalVendas;
    document.getElementById('relatorio-total-valor').textContent = formatarMoeda(totalValor);
    document.getElementById('relatorio-venda-media').textContent = formatarMoeda(vendaMedia);
    
    // Tabela de vendas
    let htmlVendas = '';
    vendasPeriodo.forEach(venda => {
        htmlVendas += `
            <tr>
                <td>#${venda.numero}</td>
                <td>${formatarData(venda.data)}</td>
                <td>${venda.cliente || 'Não informado'}</td>
                <td>${formatarMoeda(venda.total)}</td>
            </tr>
        `;
    });
    
    document.getElementById('tabela-vendas').innerHTML = htmlVendas || '<tr><td colspan="4" class="text-center">Nenhuma venda no período</td></tr>';
    
    // Produtos mais vendidos
    let htmlProdutos = '';
    produtosMaisVendidos.forEach(produto => {
        htmlProdutos += `
            <tr>
                <td>${produto.nome}</td>
                <td>${produto.quantidade}</td>
                <td>${formatarMoeda(produto.total)}</td>
            </tr>
        `;
    });
    
    document.getElementById('tabela-produtos').innerHTML = htmlProdutos || '<tr><td colspan="3" class="text-center">Nenhum produto vendido</td></tr>';
}

// Página de Configurações
async function carregarConfiguracoes() {
    if (configuracoes) {
        document.getElementById('nome-empresa').value = configuracoes.nome_empresa || '';
        document.getElementById('email').value = configuracoes.email || '';
        document.getElementById('telefone').value = configuracoes.telefone || '';
        document.getElementById('endereco').value = configuracoes.endereco || '';
        document.getElementById('cnpj').value = configuracoes.cnpj || '';
    }
}

async function salvarConfiguracoesForm() {
    const form = document.getElementById('form-configuracoes');
    const formData = new FormData(form);
    
    const config = {
        nome_empresa: formData.get('nome_empresa'),
        email: formData.get('email'),
        telefone: formData.get('telefone'),
        endereco: formData.get('endereco'),
        cnpj: formData.get('cnpj')
    };
    
    const resultado = await salvarConfiguracoes(config);
    if (resultado) {
        mostrarMensagem('Configurações salvas com sucesso!', 'success');
        configuracoes = await getConfiguracoes();
    } else {
        mostrarMensagem('Erro ao salvar configurações', 'danger');
    }
}

// Função para gerar recibo
async function gerarRecibo(numeroVenda) {
    const venda = vendas.find(v => v.numero === numeroVenda);
    if (!venda) {
        mostrarMensagem('Venda não encontrada', 'warning');
        return;
    }
    
    const produtosVenda = typeof venda.produtos === 'string' ? JSON.parse(venda.produtos) : venda.produtos;
    
    let htmlProdutos = '';
    produtosVenda.forEach(produto => {
        htmlProdutos += `
            <tr>
                <td>${produto.nome}</td>
                <td>${produto.quantidade}</td>
                <td>${formatarMoeda(produto.preco)}</td>
                <td>${formatarMoeda(produto.total)}</td>
            </tr>
        `;
    });
    
    const reciboHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h4 class="mb-0"><i class="fas fa-receipt me-2"></i>Recibo de Venda</h4>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Número da Venda:</strong> #${venda.numero}<br>
                        <strong>Data:</strong> ${formatarData(venda.data)}<br>
                        <strong>Cliente:</strong> ${venda.cliente || 'Não informado'}
                    </div>
                    <div class="col-md-6 text-end">
                        <strong>Forma de Pagamento:</strong><br>
                        ${venda.forma_pagamento || 'Não informada'}
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Produto</th>
                            <th>Qtd</th>
                            <th>Preço Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlProdutos}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="text-end"><strong>Total:</strong></td>
                            <td><strong>${formatarMoeda(venda.total)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
                
                ${venda.observacoes ? `<div class="mt-3"><strong>Observações:</strong> ${venda.observacoes}</div>` : ''}
                
                <div class="mt-4 text-center">
                    <p>${configuracoes.nome_empresa || 'Empresa'} - ${configuracoes.cnpj || ''}</p>
                    <p>${configuracoes.endereco || ''} - ${configuracoes.telefone || ''}</p>
                </div>
            </div>
            <div class="card-footer text-center">
                <button class="btn btn-primary me-2" onclick="imprimirRecibo()">
                    <i class="fas fa-print me-1"></i>Imprimir
                </button>
                <button class="btn btn-secondary" onclick="fecharRecibo()">Fechar</button>
            </div>
        </div>
    `;
    
    document.getElementById('recibo-container').innerHTML = reciboHTML;
    document.getElementById('recibo-modal').classList.remove('d-none');
}

function fecharRecibo() {
    document.getElementById('recibo-modal').classList.add('d-none');
}

function imprimirRecibo() {
    const reciboContent = document.getElementById('recibo-container').innerHTML;
    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write(`
        <html>
            <head>
                <title>Recibo de Venda</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; }
                    @media print {
                        .btn { display: none; }
                    }
                </style>
            </head>
            <body>
                ${reciboContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    }
                </script>
            </body>
        </html>
    `);
    janelaImpressao.document.close();
}

// ========== FUNÇÕES UTILITÁRIAS ==========

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

function formatarDataInput(data) {
    return data.toISOString().split('T')[0];
}

// Navegação manual para links do menu
document.addEventListener('click', function(e) {
    if (e.target.closest('.nav-link')) {
        e.preventDefault();
    }
});
