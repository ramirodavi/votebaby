# Votação de Chá Revelação 🎉👶

Este projeto é uma aplicação interativa de votação para eventos de chá revelação. Ele permite que os participantes votem se acreditam que o bebê será **Menino** ou **Menina** de forma divertida e visualmente atraente.

---

## 🚀 Funcionalidades

- **Votação Dinâmica:** Os participantes podem votar e atualizar seus votos em tempo real.
- **Atualização Automática:** Os resultados das votações são atualizados em todos os clientes conectados usando WebSocket.
- **Feedback Visual:** Gráficos em barra mostram a porcentagem de votos em tempo real.
- **Animações Divertidas:** Balões e confetes celebram cada voto.
- **Proteção de Dados:** Cada participante é identificado por um `browserId` único armazenado localmente.
- **Ambientes Diferenciados:** URLs dinâmicas para desenvolvimento e produção garantem flexibilidade.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js:** Plataforma para executar o servidor.
- **Express:** Framework para criação do servidor HTTP e endpoints.
- **PostgreSQL:** Banco de dados relacional para armazenar os votos.
- **WebSocket:** Comunicação em tempo real entre o backend e o frontend.
- **dotenv:** Gerenciamento de variáveis de ambiente.

### Frontend
- **HTML/CSS:** Estrutura e estilo para criar uma interface amigável e visualmente agradável.
- **JavaScript:** Lógica de interação com o backend, manipulação da DOM e animações.

---

## 🏗️ Estrutura do Projeto

```plaintext
.
├── frontend
│   ├── index.html          # Página inicial do frontend
│   ├── css
│   │   └── styles.css      # Arquivo de estilos do frontend
│   ├── js
│       └── scripts.js      # Lógica principal do frontend
└── backend
    ├── server.js           # Servidor principal Node.js
    ├── package.json        # Dependências do backend
    ├── package-lock.json   # Lock das dependências
    └── .env.example        # Exemplo de variáveis de ambiente
```

---

## 📦 Configuração do Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v14 ou superior)
- [PostgreSQL](https://www.postgresql.org/) (Banco de dados configurado)
- [npm](https://www.npmjs.com/) (Gerenciador de pacotes do Node.js)

---

### Configuração do Backend

1. Clone o repositório:
   ```bash
   git clone https://github.com/ramirodavi/votebaby.git
   ```

2. Navegue para a pasta `backend`:
   ```bash
   cd backend
   ```

3. Instale as dependências:
   ```bash
   npm install
   ```

4. Configure o arquivo `.env` na pasta `backend`:
   ```plaintext
   PG_USER=seu_usuario
   PG_HOST=seu_host
   PG_DATABASE=seu_banco_de_dados
   PG_PASSWORD=sua_senha
   PG_PORT=sua_porta
   API_URL=https://backend-votebaby.onrender.com/votes
   PORT=3000

   # Nomes dos bebês
   BABY_BOY_NAME=João
   BABY_GIRL_NAME=Maria

   # Resultado do chá revelação (opções: "boy", "girl", "pending")
   REVEAL_RESULT=pending

   # Texto adicional para a revelação
   REVEAL_TEXT=Bem vindo(a) ao mundo

   # Cores para o sexo masculino
   BOY_COLOR=rgb(58, 177, 98)
   BG_BOY_COLOR=rgb(172, 241, 197)

   # Cores para o sexo feminino
   GIRL_COLOR=rgb(219, 130, 207)
   BG_GIRL_COLOR=rgb(231, 179, 223)

   # Cores dos balões
   BALLOON_BOY_COLOR=rgb(58, 177, 98)
   BALLOON_GIRL_COLOR=rgb(219, 130, 207)

   # Cores do fundo da div de revelação
   REVEAL_BG_BOY_COLOR=rgb(172, 241, 197)
   REVEAL_BG_GIRL_COLOR=rgb(231, 179, 223)

   # Ativar/desativar o scroll automático (opções: "true", "false")
   ENABLE_AUTO_SCROLL=true
   ```

5. Inicie o servidor:
   ```bash
   npm start
   ou
   nodemon server.js
   ```

---

### Configuração do Frontend

1. Navegue para a pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Abra o arquivo `index.html` no navegador ou sirva a pasta com um servidor local (ex.: Live Server).

---

## 🌐 Deploy

### Backend no Render

1. Acesse o [Render](https://render.com) e crie um novo **Web Service**.
2. Configure o repositório GitHub e as variáveis de ambiente (`PG_USER`, `PG_HOST`, etc.).
3. Configure os comandos:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start ou nodemon server.js`
4. O Render gerará uma URL pública para o backend.

### Frontend no GitHub Pages

1. Suba a pasta `frontend` em um repositório GitHub.
2. Ative o **GitHub Pages** pelo repositório.

---

## 🧪 Testando o Splash de Carregamento

Para testar o comportamento do splash em operações demoradas, você pode:

1. Simular atraso no backend:
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de atraso
   ```

2. Simular atraso no frontend:
   ```javascript
   await delay(2000); // Simula 2 segundos de atraso
   ```

---

## 📂 Estrutura do Código

### Backend

- **`server.js`:** Configura o servidor, endpoints da API e comunicação WebSocket.
- **WebSocket:** Envia atualizações para os clientes em tempo real.

### Frontend

- **`scripts.js`:** Gerencia interações com o backend e atualizações na interface.
- **Animações:** Implementação de confetes e balões dinâmicos.

---

## 📝 Licença

Este projeto é de código aberto e pode ser utilizado para fins educacionais, eventos sociais ou pessoais. Contribuições são bem-vindas!

---

## 📧 Contato

Se tiver dúvidas ou sugestões, entre em contato:
- **Email:** davilopesramiro@gmail.com
- **GitHub:** [ramirodavi](https://github.com/ramirodavi/)
