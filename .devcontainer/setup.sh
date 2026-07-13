#!/bin/bash
# setup.sh — Runs once when the Codespace container is first created
# Installs all Python and Node dependencies

set -e

echo "============================================"
echo "  Deals Seller Portal — Codespace Setup"
echo "============================================"

# ── Python dependencies ──────────────────────────
echo ""
echo "→ Installing Python dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "✓ Python packages installed"

# ── Node.js dependencies ─────────────────────────
echo ""
echo "→ Installing Node.js dependencies..."
npm install --silent
echo "✓ Node packages installed"

# ── Create .env if not exists ────────────────────
if [ ! -f ".env" ]; then
  echo ""
  echo "→ Creating default .env file..."
  cat > .env << 'EOF'
# Deals Seller Portal — Environment Variables
# Generated automatically by Codespace setup

# JWT Secret — CHANGE THIS in production!
SECRET_KEY=codespace-dev-secret-change-in-production-$(openssl rand -hex 16)

# Database
DATABASE_URL=sqlite:///./portal.db

# Environment
ENVIRONMENT=development
DEBUG=true

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5000

# Frontend API base URL (used by Next.js)
NEXT_PUBLIC_API_BASE=http://localhost:5000
EOF
  echo "✓ .env file created"
fi

echo ""
echo "============================================"
echo "  ✅ Setup complete!"
echo "  Run: bash .devcontainer/start.sh"
echo "============================================"
