# AnaliseEDesenvolvimento
## Como rodar o projeto

### Pré-requisitos
- Python 3.10+
- Node.js 18+
- Git

### Backend
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
cd backend && python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
