const fs = require('fs');
const XLSX = require('xlsx');
const cheerio = require('cheerio');
const cell_number_XPATH = '#__nuxt > div > div:nth-child(2) > section:nth-child(1) > div > div > div:nth-child(4) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > p:nth-child(2) > a';

async function array_json_to_excel(future_excel,prefix){
    const ws = XLSX.utils.json_to_sheet(future_excel);

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Write the workbook to a file
    XLSX.writeFile(wb, `CNPJS_${prefix}.xlsx`);
}

function sleep(ms){
    return new Promise ((resolve,reject)=>{
        setTimeout(() => {
            resolve();
        }, ms);
    })
}

function get_cnpj_data(page,uf,cidade, bairros = []){
    return new Promise((resolve,reject)=>{
        fetch('https://api.casadosdados.com.br/v2/public/cnpj/search', {//dados pagina 3
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "query": {
                "termo": [],
                "atividade_principal": [],
                "natureza_juridica": [],
                "uf": [uf],
                "municipio": [cidade],
                "bairro": bairros,
                "situacao_cadastral": "ATIVA",
                "cep": [],
                "ddd": []
                },
                "range_query": {
                "data_abertura": {
                    "lte": null,
                    "gte": null
                },
                "capital_social": {
                    "lte": null,
                    "gte": null
                }
                },
                "extras": {
                "somente_mei": false,
                "excluir_mei": false,
                "com_email": false,
                "incluir_atividade_secundaria": false,
                "com_contato_telefonico": false,
                "somente_fixo": false,
                "somente_celular": false,
                "somente_matriz": false,
                "somente_filial": false
                },
                "page": parseInt(page)
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao fazer a requisição: ' + response.statusText);
            }
            return response.json();
        })
        .then(page_data => {
        // Faça algo com os dados recebidos
            resolve(page_data.data?.cnpj);
        })
        .catch(error => {
            reject(null);
        });
    })
}


function get_cnpj_telefone(cnpj,current_cnpj_data){
    return new Promise((resolve,reject)=>{
        a = '54258001000160';
        fetch(`https://casadosdados.com.br/solucao/cnpj/${cnpj}`,{
            method:"GET"
        })
        .then(response => {
                return response.text(); // Reading response as text
        })
        .then(html => {
            const $ = cheerio.load(html);
            resolve(
                {
                   'current_telefone': $(cell_number_XPATH).text(),
                   'current_cnpj_data': current_cnpj_data    
                }
            );
            // Faça algo com os dados recebidos
        }).catch(error => {
            console.log('vazado');
            reject(null);
        });
    })
}

function get_cnpj_with_numbers(n_pages,uf,cidade, bairros){
        return new Promise(async (resolve_all_loop,reject_all_loop)=>{
            var future_excel = [];
            var current_page_data = undefined;
            var current_telefone = undefined;
            for(let i=0;i<=n_pages;i++){
                await sleep(500);
                try{
                    get_cnpj_data(i,uf,cidade, bairros).then((current_page_data)=>{
                        console.log('deu')
                        if(current_page_data?.length){
                            for(let j=0;j<=current_page_data.length;j++){
                                var current_cnpj_data = current_page_data[j];
                                if(current_cnpj_data?.cnpj){
                                    get_cnpj_telefone(current_cnpj_data['cnpj'], current_cnpj_data).then(({current_telefone, current_cnpj_data})=>{
                                        future_excel.push({
                                            "TELEFONE":current_telefone || 'nao encontrado',
                                            "CNPJ":current_cnpj_data['cnpj'],
                                            "RAZAO": current_cnpj_data['razao_social'] || 'nao encontrado',
                                            "ESTADO": current_cnpj_data['uf'] || 'nao encontrado',
                                            "MUNICIPIO": current_cnpj_data['municipio'] || 'nao encontrado',
                                            "BAIRRO": current_cnpj_data['bairro']
                                        });
                                        console.log(future_excel.length)
                                        if(i===n_pages){
                                            resolve_all_loop(future_excel);
                                        }
                                    }).catch((error)=>{
                                        console.log(error);
                                        if(i===n_pages){
                                            resolve_all_loop(future_excel);
                                        }
                                    });
                                }
                            }
                        }
    
                    }).catch(()=>console.log('instabilidade'));// é a pagina atual nao cnpj atual
                }catch(error){
                    console.log('instabilidade na requisição');
                }
            }
        })
    
    // console.log('FINAL');
    // console.log(future_excel);
}


async function f(){
    uf = 'CE';
    cidade = 'FORTALEZA';
    bairros = ['joquei'];
    const out = await get_cnpj_with_numbers(50,uf,cidade, bairros);
    console.log('TAMANHO FINAL');
    console.log(out.length);
    array_json_to_excel(out,uf+'_'+cidade);//prefixo
}
f()



