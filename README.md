# PromptWars

## Project Setup and Execution

This project consists of a FastAPI backend and a Next.js frontend. Below are the instructions to set up and run both components locally.

### Prerequisites
- Python 3.10+
- Node.js & npm

### Backend Setup (FastAPI)

1. **Navigate to the backend directory**:
   ```powershell
   cd backend
   ```

2. **Activate the virtual environment**:
   ```powershell
   # On Windows
   .\myenv\Scripts\activate
   ```
   *(Note: If the `myenv` directory doesn't exist, you can create it with `python -m venv myenv` and install dependencies using `pip install -r requirements.txt`)*

3. **Set up Environment Variables**:
   Ensure your `.env` file in the `backend/` directory is properly configured with your Firebase and Gemini credentials.

4. **Run the FastAPI server**:
   ```powershell
   uvicorn app.main:app --reload
   ```
   The backend API will be available at [http://localhost:8000](http://localhost:8000) and the Swagger UI documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### Frontend Setup (Next.js)

1. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install dependencies** (if not already installed):
   ```powershell
   npm install
   ```

3. **Run the Next.js development server**:
   ```powershell
   npm run dev
   ```
   The frontend application will be accessible at [http://localhost:3000](http://localhost:3000).
