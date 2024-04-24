const fs = require('fs');
const XLSX = require('xlsx');
const cheerio = require('cheerio');
const cell_number_XPATH = '#__nuxt > div > div:nth-child(2) > section:nth-child(1) > div > div > div:nth-child(4) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > p:nth-child(2) > a';


const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0'
];

function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}


function remove_array_object_duplicates(array_obj,key="CNPJ"){//[obj1,obj2,...]
    var empiric = [];
    var new_array_obj = array_obj.map((e)=>{
        if(e.hasOwnProperty(key)){
            if(!(empiric.includes(e[key]))){
                empiric.push(e[key]);//nao passa por esse valor de cnpj novamente
                return e;
            }else{
                return null;
            }
        }else{
            return null;
        }
    }).filter((e1)=>e1);
    return new_array_obj;
}

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
            console.log(error)
            reject(null);
        });
    })
}


function get_cnpj_telefone(cnpj,current_cnpj_data){
    return new Promise((resolve,reject)=>{
        a = '54258001000160';
        fetch(`https://casadosdados.com.br/solucao/cnpj/${cnpj}`,{
            method:"GET",
            headers: {
                'Content-Type': 'application/json'
            }
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
            console.log(error);
            console.log('foi cnpj particular erro')
            reject(null);
        });
    })
}

function get_cnpj_with_numbers(n_pages,uf,cidade, bairros){
        return new Promise(async (resolve_all_loop,reject_all_loop)=>{
            const cnpj_data_promises = [];//nao precisa
            const tel_promises = [];//nao precisa
            const last_promises = [];//util p krl
            var future_excel = [];
            var current_page_data = undefined;
            var current_telefone = undefined;
            for(let i=0;i<=n_pages;i++){
                await sleep(500);
                try{
                    var get_cnpj_data_promise = get_cnpj_data(i,uf,cidade, bairros);
                    cnpj_data_promises.push(get_cnpj_data_promise);
                    get_cnpj_data_promise.then((current_page_data)=>{
                        // console.log('deu')
                        if(current_page_data?.length){
                            for(let j=0;j<=current_page_data.length;j++){
                                var current_cnpj_data = current_page_data[j];
                                if(current_cnpj_data?.cnpj){
                                    var get_cnpj_telefone_promise = get_cnpj_telefone(current_cnpj_data['cnpj'], current_cnpj_data);
                                    tel_promises.push(get_cnpj_telefone_promise)
                                    var last_promise = get_cnpj_telefone_promise.then(({current_telefone, current_cnpj_data})=>{
                                        future_excel.push({
                                            "TELEFONE":current_telefone || 'nao encontrado',
                                            "CNPJ":current_cnpj_data['cnpj'],
                                            "RAZAO": current_cnpj_data['razao_social'] || 'nao encontrado',
                                            "ESTADO": current_cnpj_data['uf'] || 'nao encontrado',
                                            "MUNICIPIO": current_cnpj_data['municipio'] || 'nao encontrado',
                                            "BAIRRO": current_cnpj_data['bairro']
                                        })
                                        return future_excel;
                                        // console.log(future_excel.length)
                                    }).catch(()=>null);
                                    last_promises.push(last_promise);
                                }
                            }
                        }
    
                    }).catch(()=>console.log('instabilidade'));// é a pagina atual nao cnpj atual
                }catch(error){
                    console.log('instabilidade na requisição');
                }
            }

            if(last_promises[last_promises.length-1] instanceof Promise){
                last_promises[last_promises.length-1].then((future_excel)=>{
                    resolve_all_loop(future_excel);
                }).catch(()=>reject_all_loop(null))
            }else{
                reject_all_loop(null)
            }

            // var reverted_promises = last_promises.reverse();

            // console.log('reverted promises');
            // console.log(reverted_promises);
            // console.log('reverted promises 0');
            // console.log(reverted_promises[0]);

            // var was_solved = 0;

            // var isResolved = false; // Variável de controle para indicar se uma promessa foi resolvida

            // for (var k = 0; k < reverted_promises.length; k++) {
            //     if (isResolved) break; // Se uma promessa já foi resolvida, saia do loop
            //     reverted_promises[k].then((future_excel) => {
            //         console.log('PROMISE NO LOOP');
            //         console.log(reverted_promises[k]);
            //         if (future_excel) {
            //             console.log(resolveu);
            //             resolve_all_loop(future_excel);
            //             isResolved = true; // Define a variável de controle para true para indicar que uma promessa foi resolvida
            //         }
            //     }).catch(() => {});
            // }
            
            
            // if(!was_solved){
            //     reject_all_loop([]);
            // }
        })
    
    // console.log('FINAL');
    // console.log(future_excel);
}


async function f(){
    const uf = 'CE';
    const cidade = 'FORTALEZA';
    const bairros = ['aldeota'];
    if(bairros.length){
        for(var i=0;i<bairros.length;i++){
            try{
                console.log('PROGRESSO');
                console.log(i);
                var out = await get_cnpj_with_numbers(50,uf,cidade, [bairros[i]]);
                console.log('PASSOU POR OUT');
                console.log(out);
                var clean = remove_array_object_duplicates(out,key="CNPJ");
                console.log('CLEAN');
                console.log(clean);
                if(clean?.length){
                    console.log('EXCEL TESTE');
                    array_json_to_excel(clean,bairros[i].toUpperCase()+'_'+cidade);//prefixo
                }
            }catch(error){
                console.log('erro');
            }
              
        }
    }else{
        try{
            console.log('PROGRESSO');
            console.log(0);
            var out = await get_cnpj_with_numbers(50,uf,cidade, []);
            console.log('PASSOU POR OUT');
            console.log(out);
            var clean = remove_array_object_duplicates(out,key="CNPJ");
            console.log('CLEAN');
            console.log(clean);
            if(clean?.length){
                console.log('EXCEL TESTE');
                array_json_to_excel(clean,cidade);//prefixo
            }
        }catch(error){
            console.log('erro');
        }
    }
}
f()



