# 📄 Document Processing Pipeline

A production-ready full-stack document processing platform that enables users to securely upload, manage, and process documents using asynchronous cloud-based workflows.

The application follows a modern cloud-native architecture using AWS services, Docker, GitHub Actions CI/CD, Nginx Reverse Proxy, and HTTPS secured with Let's Encrypt.

---

## 🌐 Live Demo

### Frontend

https://app.punithcodes.uk

### Backend API

https://api.punithcodes.uk

### Swagger Documentation

https://api.punithcodes.uk/api

---

## ✨ Features

- User Registration & Login
- Secure JWT Authentication using HttpOnly Cookies
- Upload PDF Documents
- Store Documents in Amazon S3
- Asynchronous Processing using Amazon SQS
- PostgreSQL Database (Amazon RDS)
- Mark Documents as Favorite
- Restore Deleted Documents
- Soft Delete Support
- Search & Filter Documents
- Responsive React UI
- Swagger API Documentation
- HTTPS using Let's Encrypt
- GitHub Actions CI/CD
- Dockerized Backend

---

## 🏗️ Architecture

```

React (Vercel)
│
▼
Nginx Reverse Proxy
│
▼
NestJS Backend (Docker)
│
├── PostgreSQL (Amazon RDS)
├── Amazon S3
└── Amazon SQS

```

---

## 🛠️ Tech Stack

### Frontend

- React.js
- TypeScript
- Vite
- Axios
- React Router

### Backend

- NestJS
- Prisma ORM
- PostgreSQL
- Passport JWT
- Swagger

### Cloud

- AWS EC2
- Amazon RDS
- Amazon S3
- Amazon SQS

### DevOps

- Docker
- Nginx
- GitHub Actions
- Let's Encrypt SSL
- Vercel

---

## 🔐 Authentication

The application uses secure cookie-based authentication.

- JWT Tokens
- HttpOnly Cookies
- Secure Cookies
- SameSite Protection
- HTTPS Encryption
- Protected Routes

---

## 🚀 CI/CD Pipeline

Every push to the **main** branch automatically triggers deployment.

```

Developer
↓

Git Push

↓

GitHub

↓

GitHub Actions

↓

SSH into EC2

↓

Pull Latest Code

↓

Build Docker Image

↓

Restart Container

↓

Application Updated

```

---

## 📁 Project Structure

```

documentPipeline/

├── frontend/
│ ├── src/
│ ├── public/
│ └── package.json
│
├── backend/
│ ├── src/
│ ├── prisma/
│ ├── Dockerfile
│ └── package.json
│
└── .github/
└── workflows/
└── deploy.yml

```

---

## ⚙️ Local Setup

Clone the repository

```bash
git clone https://github.com/PunithParamesh/documentPipeline.git
