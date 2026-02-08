
# 🍔 Nilo Lanches - Guia de Inicialização Local

## 🚀 Como testar tudo localmente

1. **Pastas**: Crie a estrutura de pastas conforme os arquivos (`components/`, `services/`, etc).
2. **Dependências**: 
   ```powershell
   npm install
   ```
3. **Variáveis**: Crie um `.env` com sua `API_KEY`.
4. **Executar**:
   ```powershell
   npm run dev
   ```

## 🔐 Acesso Admin
- **Usuário:** `nilo`
- **Senha:** `nilo123`

## 🌐 Solução de Problemas: Domínio (Vercel)

Se a Vercel mostrar a mensagem **"Update the nameservers"**:

1. **NÃO ALTERE OS NAMESERVERS** se você possui e-mails profissionais (ex: contato@nilolanches.com.br) na Hostgator, Hostinger ou Godaddy. Alterar os Nameservers fará seus e-mails pararem de funcionar.
2. **Método Correto**: Utilize apenas os registros DNS (A e CNAME).
   - **Tipo A**: `@` (ou vazio) apontando para `76.76.21.21`
   - **Tipo CNAME**: `www` apontando para `cname.vercel-dns.com`
3. **Status "Invalid Configuration"**: É normal aparecer isso enquanto a propagação não conclui. Pode levar de 1 a 24 horas.
4. **Redirecionamento**: Certifique-se de adicionar tanto `nilolanches.com.br` quanto `www.nilolanches.com.br` no painel da Vercel. A Vercel perguntará qual deve ser o principal e redirecionará o outro automaticamente.
