# SplitNice

## Backend
cd backend
python -m venv .venv
source .venv/Scripts/activate   # on Windows Git Bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000

## Frontend
cd frontend
npm install
npm run dev
