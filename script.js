// --- ELEMENTOS DO DOM ---
const generateBtn = document.getElementById('generate-btn');
const btnText = document.getElementById('btn-text');
const loader = document.getElementById('loader');
const reportOutput = document.getElementById('report-output');
const form = document.getElementById('report-form');
const exportActionsContainer = document.getElementById('export-actions');
const copyBtn = document.getElementById('copy-btn');
const downloadDocBtn = document.getElementById('download-doc-btn');
const depoenteRgNumeroInput = document.getElementById('depoente_rg_numero');
const depoenteCpfInput = document.getElementById('depoente_cpf');

let currentReportText = ''; 

document.querySelectorAll('.export-btn').forEach(btn => {
    btn.className += " w-full text-center py-2 px-3 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
});

// --- FUNÇÃO DE CHAMADA DA API (via Netlify Function) ---
async function callGeminiAPI(prompt) {
    const functionUrl = '/.netlify/functions/gemini';
    
    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const errorMessage = result?.error || `Falha ao chamar a IA (${response.status}).`;
        throw new Error(`Erro na solicitação: ${response.statusText}. Detalhes: ${errorMessage}`);
    }
    
    if (result.success && result.text) {
        return result.text;
    } else {
        console.error("Erro ao processar resposta:", result);
        throw new Error(result.error || 'A resposta da IA não contém o texto esperado.');
    }
}

// --- FUNÇÃO DE VALIDAÇÃO DO FORMULÁRIO ---
function validateForm() {
    const requiredFields = form.querySelectorAll('[data-label]');
    const missingFields = [];
    
    requiredFields.forEach(input => {
        if (!input.value.trim()) {
            missingFields.push(input.dataset.label);
            input.classList.add('border-red-500');
        } else {
            input.classList.remove('border-red-500');
        }
    });

    if (missingFields.length > 0) {
        const errorMessage = `Por favor, preencha os seguintes campos obrigatórios:<br>- ${missingFields.join('<br>- ')}`;
        reportOutput.innerHTML = `<p class="italic text-red-600">${errorMessage}</p>`;
        exportActionsContainer.classList.add('hidden');
        return false;
    }
    return true;
}

// --- EVENT LISTENER PRINCIPAL (GERAR TERMO) ---
generateBtn.addEventListener('click', async () => {
    if (!validateForm()) {
        return;
    }

    const escrivaoNome = document.getElementById('escrivao_select').value;
    const depoenteNome = document.getElementById('depoente_nome').value.trim();
    const rgNumero = document.getElementById('depoente_rg_numero').value.trim();
    const rgDigito = document.getElementById('depoente_rg_digito').value.trim();
    const depoenteRgCompleto = rgDigito ? `${rgNumero}-${rgDigito}` : rgNumero;
    const depoenteEstadoRg = document.getElementById('depoente_estado_rg').value;
    const depoenteCpf = document.getElementById('depoente_cpf').value;
    
    const data = {};
    const occurrenceInputs = form.querySelectorAll('input[id^="q"], textarea[id^="q"]');
    occurrenceInputs.forEach((input, index) => {
         data[`q${index + 1}`] = input.value.trim();
    });

    generateBtn.disabled = true;
    btnText.textContent = 'Gerando...';
    loader.classList.remove('hidden');
    exportActionsContainer.classList.add('hidden');
    reportOutput.innerHTML = `<p class="italic text-slate-500">Aguarde, a IA está processando as informações e construindo o Termo de Depoimento...</p>`;
    
    const date = new Date();
    const formattedDate = `${date.getDate()} do mês de ${date.toLocaleString('pt-BR', { month: 'long' })} de ${date.getFullYear()}`;
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const prompt = `
Aja como um Escrivão de Polícia do DHPP de São Paulo, redigindo um "Termo de Depoimento" oficial.
Siga ESTRITAMENTE o formato, a linguagem e a estrutura do exemplo a seguir para criar um documento formal.

**TAREFA:**
Gere o Termo de Depoimento completo usando os dados abaixo. Use a data e hora atuais para o cabeçalho.

**CABEÇALHO DO DOCUMENTO:**
- Comece com o título "Termo de Depoimento".
- Continue com: "Às ${formattedTime} horas do dia ${formattedDate}, na sede do Plantão Policial do DHPP DIV. HOMICIDIOS, presidido pela Autoridade Policial Exmo(a) Sr(a) Dr(a) Guilherme De Souza Rabello, comigo, ${escrivaoNome}, Escrivão(ã) de Polícia, passou-se à inquirição da testemunha Condutor, Nome ${depoenteNome}, RG ${depoenteRgCompleto} - ${depoenteEstadoRg}, CPF ${depoenteCpf}, profissão Policial militar. Compromissada, às de costume nada disse."

**CORPO DO DEPOIMENTO (NARRATIVA ÚNICA E COESA):**
O texto DEVE começar com "Indagada, às perguntas respondeu:" e usar os seguintes dados para construir a narrativa:

- **Lotação da Testemunha:** ${data.q1}
- **Guarnição da Testemunha:** ${data.q2}
- **Como e quando soube dos fatos:** ${data.q3}
- **Endereço e tempo de deslocamento:** ${data.q4}
- **Cena encontrada no local:** ${data.q5}
- **Relato sobre a intervenção:** ${data.q6}
- **Presença de outras testemunhas civis:** ${data.q7}
- **Relato ouvido dos policiais envolvidos diretamente:** ${data.q8}
- **Status, câmeras e quem disparou da viatura envolvida:** ${data.q9}
- **Primeiras providências da testemunha no local:** ${data.q10}
- **Equipes de socorro e informação do óbito:** ${data.q11}
- **Outras informações relevantes:** ${data.q12}

**RODAPÉ DO DOCUMENTO:**
- Inclua o parágrafo de encerramento padrão: "Nada mais disse nem lhe foi perguntado. Nada mais havendo a tratar ou a relatar, determinou a Autoridade o encerramento do presente termo que, após lido e achado conforme, vai por todos devidamente assinado, inclusive por mim ${escrivaoNome}, Escrivão(ã) de Polícia que parcialmente o digitei."
- Adicione os campos de assinatura para:
Guilherme De Souza Rabello
Delegado(a) de Polícia
__________________________
${depoenteNome}
Testemunha
${escrivaoNome}
Escrivão(ã) de Polícia

O produto final deve ser um documento de texto único, pronto para ser copiado, sem as numerações ou títulos dos campos de dados.
`;

    try {
        currentReportText = await callGeminiAPI(prompt);
        reportOutput.textContent = currentReportText;
        exportActionsContainer.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        currentReportText = '';
        reportOutput.innerHTML = `<p class="italic text-red-600"><b>Erro ao conectar com a IA.</b><br>${error.toString()}</p>`;
    } finally {
        generateBtn.disabled = false;
        btnText.textContent = 'Gerar Termo de Depoimento';
        loader.classList.add('hidden');
    }
});

// --- FUNÇÕES AUXILIARES (MÁSCARAS E EXPORTAÇÃO) ---

// Impede digitação de não-números
const allowOnlyNumbers = (e) => {
    if (e.key.length === 1 && e.key.match(/[^0-9]/)) {
        e.preventDefault();
    }
};
depoenteRgNumeroInput.addEventListener('keydown', allowOnlyNumbers);
depoenteCpfInput.addEventListener('keydown', allowOnlyNumbers);

// Aplica a máscara
depoenteRgNumeroInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    e.target.value = value;
});

depoenteCpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{2})$/, "$1-$2");
    e.target.value = value;
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentReportText).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copiado!';
        copyBtn.classList.add('bg-green-100', 'text-green-800');
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('bg-green-100', 'text-green-800');
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar texto: ', err);
        alert('Falha ao copiar o texto. Por favor, copie manualmente.');
    });
});

downloadDocBtn.addEventListener('click', () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
    "xmlns:w='urn:schemas-microsoft-com:office:word' "+
    "xmlns='http://www.w3.org/TR/REC-html40'>"+
    "<head><meta charset='utf-8'><title>Termo de Depoimento</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + reportOutput.innerText.replace(/\n/g, '<br>') + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    const depoenteNome = document.getElementById('depoente_nome').value.trim().replace(/ /g, '_') || 'Depoimento';
    fileDownload.download = `Termo_Depoimento_${depoenteNome}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
});
