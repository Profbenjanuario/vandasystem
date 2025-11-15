// Configurações do Supabase - ATUALIZE ESTES VALORES
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-publica';

// Inicializar cliente Supabase
function initSupabase() {
  return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Função para obter dados da tabela
async function getDataFromTable(tableName) {
  try {
    const supabase = initSupabase();
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

// Função para inserir dados
async function insertData(tableName, data) {
  try {
    const supabase = initSupabase();
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

// Função para atualizar dados
async function updateData(tableName, id, data) {
  try {
    const supabase = initSupabase();
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

// Função para deletar dados
async function deleteData(tableName, id) {
  try {
    const supabase = initSupabase();
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
    const supabase = initSupabase();
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
