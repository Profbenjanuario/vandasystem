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
t
// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    inicializarSupabase();
    carregarPagina('resumo');
});

// ========== SUPABASE ==========
function inicializarSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase inicializado');
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        mostrarMensagem('Erro ao conectar com o banco de dados', 'danger');
    }
}

// ========== FUNÇÕES SUPABASE ==========
async function getDataFromTable(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
        
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
async function getProdutos() {
    return await getDataFromTable('produtos');
}

async function getVendas() {
    return await getDataFromTable('vendas');
}

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

async function atualizarProduto(id, produto) {
    return await updateData('produtos', id, {
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        preco: parseFloat(produto.preco),
        estoque: parseInt(produto.estoque),
        updated_at: new Date().toISOString()
    });
}

async function excluirProduto(id) {
    return await deleteData('produtos', id);
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
        data: new Date().toISOString(),
        created_at: new Date().toISOString()
    });
}

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

// ========== FUNÇÕES DE PÁGINAS ==========
async function carregarPagina(pagina) {
    try {
        console.log(`📄 Carregando página: ${pagina}`);
        const response = await fetch(`${pagina}.html`);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        document.getElementById('conteudo').innerHTML = html;
        
        // Atualizar menu ativo
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Carregar dados e página específica
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
        mostrarMensagem(`Erro ao carregar página: ${error.message}`, 'danger');
    }
}

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
        console.error('Erro ao carregar dados iniciais:', error);
        mostrarMensagem('Erro ao carregar dados do sistema', 'danger');
    }
}

// ========== PÁGINA RESUMO ==========
async function carregarResumo() {
    try {
        const resumo = await getResumoVendas();
        
        document.getElementById('total-vendas').textContent = resumo.totalVendas;
        document.getElementById('total-valor').textContent = formatarMoeda(resumo.totalValor);
        document.getElementById('venda-media').textContent = formatarMoeda(resumo.vendaMedia);
        document.getElementById('vendas-mes').textContent = resumo.vendasMes;
        document.getElementById('total-mes').textContent = formatarMoeda(resumo.totalMes);
        
        // Vendas recentes
        const vendasRecentes = vendas.slice(-5).reverse();
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
        
        document.getElementById('vendas-recentes').innerHTML = htmlVendasRecentes || 
            '<div class="text-center p-3 text-muted">Nenhuma venda recente</div>';
            
        // Estatísticas
        atualizarEstatisticasResumo();
        
    } catch (error) {
        console.error('Erro ao carregar resumo:', error);
    }
}

async function getResumoVendas() {
    try {
        const totalVendas = vendas.length;
        const totalValor = vendas.reduce((sum, venda) => sum + (parseFloat(venda.total) || 0), 0);
        const vendaMedia = totalVendas > 0 ? totalValor / totalVendas : 0;
        
        // Vendas do mês
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

function atualizarEstatisticasResumo() {
    const totalProdutos = produtos.length;
    const produtosEstoque = produtos.filter(p => p.estoque > 0).length;
    const produtosSemEstoque = produtos.filter(p => p.estoque <= 0).length;
    
    const hoje = new Date().toISOString().split('T')[0];
    const vendasHoje = vendas.filter(v => v.data.split('T')[0] === hoje).length;
    
    document.getElementById('total-produtos').textContent = totalProdutos;
    document.getElementById('produtos-estoque').textContent = produtosEstoque;
    document.getElementById('produtos-sem-estoque').textContent = produtosSemEstoque;
    document.getElementById('vendas-hoje').textContent = vendasHoje;
}

// ========== PÁGINA VENDAS ==========
async function carregarVendas() {
    try {
        let html = '';
        if (vendas.length === 0) {
            html = '<tr><td colspan="7" class="text-center text-muted">Nenhuma venda encontrada</td></tr>';
        } else {
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
        }
        
        document.getElementById('lista-vendas').innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
    }
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

// ========== PÁGINA NOVA VENDA ==========
async function carregarNovaVenda() {
    try {
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
        
        // Atualizar info estoque
        atualizarInfoEstoque();
        
    } catch (error) {
        console.error('Erro ao carregar nova venda:', error);
    }
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
        const novoTotal = Math.max(0, totalAtual - valor);
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

function atualizarInfoEstoque() {
    const totalProdutos = produtos.length;
    const produtosDisponiveis = produtos.filter(p => p.estoque > 0).length;
    const produtosIndisponiveis = produtos.filter(p => p.estoque <= 0).length;
    
    document.getElementById('info-total-produtos').textContent = totalProdutos;
    document.getElementById('info-produtos-disponiveis').textContent = produtosDisponiveis;
    document.getElementById('info-produtos-indisponiveis').textContent = produtosIndisponiveis;
}

// ========== PÁGINA PRODUTOS ==========
async function carregarProdutos() {
    try {
        let html = '';
        if (produtos.length === 0) {
            html = '<tr><td colspan="6" class="text-center text-muted">Nenhum produto cadastrado</td></tr>';
        } else {
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
        }
        
        document.getElementById('lista-produtos').innerHTML = html;
        atualizarEstatisticasProdutos();
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
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

function atualizarEstatisticasProdutos() {
    const produtosEstoque = produtos.filter(p => p.estoque > 0).length;
    const valorTotalEstoque = produtos.reduce((sum, p) => sum + (p.preco * p.estoque), 0);
    const produtosBaixoEstoque = produtos.filter(p => p.estoque > 0 && p.estoque <= 5).length;
    
    document.getElementById('total-produtos-ativo').textContent = produtosEstoque;
    document.getElementById('total-valor-estoque').textContent = formatarMoeda(valorTotalEstoque);
    document.getElementById('produtos-baixo-estoque').textContent = produtosBaixoEstoque;
}

// ========== PÁGINA RELATÓRIOS ==========
async function carregarRelatorio() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    document.getElementById('data-inicio').value = formatarDataInput(primeiroDiaMes);
    document.getElementById('data-fim').value = formatarDataInput(hoje);
}

async function gerarRelatorio() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    
    if (!dataInicio || !dataFim) {
        mostrarMensagem('Selecione o período do relatório', 'warning');
        return;
    }
    
    try {
        const { data: vendasPeriodo, error } = await supabase
            .from('vendas')
            .select('*')
            .gte('data', dataInicio)
            .lte('data', dataFim);
        
        if (error) throw error;
        
        // Estatísticas
        const totalVendas = vendasPeriodo.length;
        const totalValor = vendasPeriodo.reduce((sum, venda) => sum + (parseFloat(venda.total) || 0), 0);
        const vendaMedia = totalVendas > 0 ? totalValor / totalVendas : 0;
        
        document.getElementById('relatorio-total-vendas').textContent = totalVendas;
        document.getElementById('relatorio-total-valor').textContent = formatarMoeda(totalValor);
        document.getElementById('relatorio-venda-media').textContent = formatarMoeda(vendaMedia);
        
        // Tabela de vendas
        let htmlVendas = '';
        if (vendasPeriodo.length === 0) {
            htmlVendas = '<tr><td colspan="4" class="text-center text-muted">Nenhuma venda no período</td></tr>';
        } else {
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
        }
        
        document.getElementById('tabela-vendas').innerHTML = htmlVendas;
        
        // Produtos mais vendidos (simplificado)
        let htmlProdutos = '<tr><td colspan="3" class="text-center text-muted">Funcionalidade em desenvolvimento</td></tr>';
        document.getElementById('tabela-produtos').innerHTML = htmlProdutos;
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        mostrarMensagem('Erro ao gerar relatório', 'danger');
    }
}

// ========== PÁGINA CONFIGURAÇÕES ==========
async function carregarConfiguracoes() {
    try {
        if (configuracoes) {
            document.getElementById('nome-empresa').value = configuracoes.nome_empresa || '';
            document.getElementById('email').value = configuracoes.email || '';
            document.getElementById('telefone').value = configuracoes.telefone || '';
            document.getElementById('endereco').value = configuracoes.endereco || '';
            document.getElementById('cnpj').value = configuracoes.cnpj || '';
        }
        atualizarEstatisticasConfig();
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
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

function atualizarEstatisticasConfig() {
    document.getElementById('config-total-produtos').textContent = produtos.length;
    document.getElementById('config-total-vendas').textContent = vendas.length;
    document.getElementById('config-total-config').textContent = configuracoes && configuracoes.id ? 1 : 0;
}

// ========== FUNÇÃO RECIBO ==========
function gerarRecibo(numeroVenda) {
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
    
    // Criar modal dinamicamente
    const modalHTML = `
        <div class="modal fade show" style="display: block; background: rgba(0,0,0,0.5)" id="reciboModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    ${reciboHTML}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharRecibo() {
    const modal = document.getElementById('reciboModal');
    if (modal) {
        modal.remove();
    }
}

function imprimirRecibo() {
    window.print();
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
    if (content && content.firstChild) {
        content.insertBefore(alerta, content.firstChild);
    }
    
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

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

// ========== NAVEGAÇÃO CORRIGIDA ==========
function navegarPara(pagina) {
    carregarPagina(pagina);
}

// Navegação para links do menu
document.addEventListener('click', function(e) {
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
        e.preventDefault();
        // Remove a classe active de todos os links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        // Adiciona a classe active ao link clicado
        navLink.classList.add('active');
        
        // Obtém a página do atributo onclick
        const onclickAttr = navLink.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/'([^']+)'/);
            if (match && match[1]) {
                carregarPagina(match[1]);
            }
        }
    }
});