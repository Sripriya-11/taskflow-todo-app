# TaskFlow - Full Stack Todo App

**Live demo:** https://taskflow-todo-app-nu.vercel.app/

A MERN stack todo application with user authentication.

## Features
- Register / login with JWT authentication and bcrypt password hashing
- Create, edit, complete and delete tasks (each user sees only their own)
- Priority levels, due dates and overdue highlighting
- Search and filter (all / pending / done)
- Dashboard counters, dark mode, responsive design

## Tech Stack
React (Vite), Node.js, Express, MongoDB (Mongoose), JWT

## Run locally
Server:
    cd server
    npm install
    (edit .env with your MONGO_URI)
    npm run dev

Client (new terminal):
    cd client
    npm install
    npm run dev

Open http://localhost:5173

## API
POST /api/auth/register, POST /api/auth/login
GET/POST /api/tasks, PUT/DELETE /api/tasks/:id (Bearer token required)

## Deployment
Backend on Render, frontend on Vercel (set VITE_API_URL to the backend URL), database on MongoDB Atlas.
