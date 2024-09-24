const venom = require('venom-bot');
const axios = require('axios');

let client;
const userData = {}; // Armazena os dados dos usuários

function start(clientInstance) {
    client = clientInstance;
    client.onMessage((message) => {
        if (message.isGroupMsg === false) {
            const userNumber = message.from;
            userData[userNumber] = userData[userNumber] || {};

            if (!userData[userNumber].city) {
                const welcomeMessage = `Você está falando com o DANILO, BOTIJÃO DE ATENDIMENTO VIRTUAL do depósito de gás.`;
                const initialOptions = `Em qual cidade satélite você deseja atendimento?\nCidades disponíveis:\n1 - Sobradinho I\n2 - Sobradinho II\n3 - Vicente Pires\n4 - Planaltina\n5 - Ceilândia\n6 - Guará II`;

                client.sendText(userNumber, welcomeMessage).then(() => {
                    setTimeout(() => {
                        client.sendText(userNumber, initialOptions);
                    }, 1000); // Espera de 1 segundo antes de enviar as opções
                });
            } else if (!userData[userNumber].name) {
                const cityOptions = {
                    '1': 'Sobradinho I',
                    '2': 'Sobradinho II',
                    '3': 'Vicente Pires',
                    '4': 'Planaltina',
                    '5': 'Ceilândia',
                    '6': 'Guará II'
                };

                const selectedCity = message.body;
                if (cityOptions[selectedCity]) {
                    userData[userNumber].city = cityOptions[selectedCity];
                    client.sendText(userNumber, 'Por favor, informe o seu nome completo:');
                } else {
                    client.sendText(userNumber, 'Opção inválida. Por favor, selecione uma cidade:\n1 - Sobradinho I\n2 - Sobradinho II\n3 - Vicente Pires\n4 - Planaltina\n5 - Ceilândia\n6 - Guará II');
                }
            } else {
                // Chama a função para lidar com a entrada de dados do usuário
                handleUserDataInput(client, userNumber, message.body);
            }
        }
    });

    monitorConnection();
}

function handleUserDataInput(client, userNumber, userResponse) {
    const userSession = userData[userNumber];

    if (!userSession.name) {
        userSession.name = userResponse;
        client.sendText(userNumber, 'Por favor, informe o seu CEP (Somente Números):');
    } else if (!userSession.cep) {
        userSession.cep = userResponse;
        getAddressByCep(userSession.cep).then(addressData => {
            if (addressData) {
                userSession.address = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade}`;
                client.sendText(userNumber, `Endereço encontrado: ${userSession.address}. \n\nPor favor, complete o endereço para facilitar a entrega:`);
            } else {
                client.sendText(userNumber, 'CEP inválido. Tente novamente:');
            }
        });
    } else if (!userSession.fullAddress) {
        userSession.fullAddress = userResponse;
        client.sendText(userNumber, 'Por favor, informe um telefone para contato de emergência:');
    } else if (!userSession.emergencyContact) {
        userSession.emergencyContact = userResponse;
        client.sendText(userNumber, 'Informe um ponto de referência:');
    } else if (!userSession.reference) {
        userSession.reference = userResponse;
        const confirmationMessage = `Por favor, confirme os seus dados:\n\nCidade: ${userSession.city}\nNome: ${userSession.name}\nEndereço: ${userSession.address}, ${userSession.fullAddress}\nTelefone Emergência: ${userSession.emergencyContact}\nPonto de Referência: ${userSession.reference}\n\nEstá tudo correto? (Responda com "1" para confirmar ou "2" para corrigir)`;
        client.sendText(userNumber, confirmationMessage);
    } else if (userResponse === '1') {
        client.sendText(userNumber, 'Dados confirmados! Selecione o tipo de gás que deseja:\n1 - Gás de Cozinha\n2 - Gás Industrial (Grande)\n3 - Gás Pequeno');
    } else if (userResponse === '2') {
        client.sendText(userNumber, 'Por favor, reinicie o processo e insira os dados corretos.');
        delete userData[userNumber]; // Reiniciar o cadastro
    } else if (!userSession.gasType) {
        const gasType = userResponse;
        if (gasType === '1' || gasType === '2' || gasType === '3') {
            userSession.gasType = gasType === '1' ? 'Gás de Cozinha' : gasType === '2' ? 'Gás Industrial' : 'Gás Pequeno';
            client.sendText(userNumber, 'Por favor, selecione o método de pagamento:\n1 - PIX\n2 - Dinheiro\n3 - Cartão');
            console.log(`Tipo de gás selecionado por ${userNumber}: ${userSession.gasType}`);
        } else {
            client.sendText(userNumber, 'Opção inválida. Por favor, selecione o tipo de gás:\n1 - Gás de Cozinha\n2 - Gás Industrial (Grande)\n3 - Gás Pequeno');
            console.log(`Opção de gás inválida recebida de ${userNumber}: ${userResponse}`);
        }
    } else if (!userSession.paymentMethod) {
        const paymentMethod = userResponse;
        if (paymentMethod === '1') {
            userSession.paymentMethod = 'PIX';
            client.sendText(userNumber, 'Por favor, envie o comprovante de pagamento PIX.');
            console.log(`Método de pagamento selecionado por ${userNumber}: PIX`);
        } else if (paymentMethod === '2') {
            userSession.paymentMethod = 'Dinheiro';
            client.sendText(userNumber, 'Precisa de troco? Se sim, para quanto:');
            console.log(`Método de pagamento selecionado por ${userNumber}: Dinheiro`);
        } else if (paymentMethod === '3') {
            userSession.paymentMethod = 'Cartão';
            client.sendText(userNumber, 'O entregador levará a máquina de cartão para o pagamento.');
            console.log(`Método de pagamento selecionado por ${userNumber}: Cartão`);
        } else {
            client.sendText(userNumber, 'Opção inválida. Selecione o método de pagamento:\n1 - PIX\n2 - Dinheiro\n3 - Cartão');
            console.log(`Opção de pagamento inválida recebida de ${userNumber}: ${userResponse}`);
        }
    } else {
        client.sendText(userNumber, 'Obrigado pelo seu pedido! Vamos processar a sua solicitação.');
        delete userData[userNumber]; // Limpa os dados do usuário após o pedido ser salvo
    }
}

function monitorConnection() {
    setInterval(() => {
        client.getConnectionState().then((state) => {
            if (state !== 'CONNECTED') {
                console.warn(`Estado da conexão: ${state}. Tentando reconectar...`);
                client.useHere(); // Tenta usar a sessão existente para reconectar
            }
        }).catch((error) => {
            console.error('Erro ao verificar o estado da conexão:', error);
        });
    }, 300000); // Verificar a cada 5 minutos
}

async function getAddressByCep(cep) {
    try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.data && !response.data.erro) {
            return response.data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erro ao consultar o CEP:', error);
        return null;
    }
}


function initializeBot() {
    venom
        .create({
            session: 'session_name',
            multidevice: true,
            folderNameToken: 'tokens',
            headless: false,
            useChrome: true,
            browserArgs: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote'
            ],
            debug: true // Habilita logs detalhados
        })
        .then((clientInstance) => start(clientInstance))
        .catch((erro) => {
            console.error('Erro ao criar a sessão do Venom:', erro);
            setTimeout(initializeBot, 30000); // Tentar novamente após 30 segundos em caso de erro
        });
}

// Inicie o bot
initializeBot();