#!/bin/bash

# AI Brain Setup Script
# This script helps you set up the LLM integration for the Business Brain

echo "🧠 AI Business Brain Setup"
echo "========================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# AI Brain Configuration
# Choose your LLM provider: openai, anthropic, google, local
REACT_APP_LLM_PROVIDER=openai

# OpenAI Configuration (recommended)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_LLM_MODEL=gpt-4-turbo-preview

# Alternative: Anthropic Claude
# REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key_here
# REACT_APP_LLM_MODEL=claude-3-sonnet-20240229

# Alternative: Google Gemini
# REACT_APP_GOOGLE_API_KEY=your_google_api_key_here
# REACT_APP_LLM_MODEL=gemini-pro

# LLM Settings
REACT_APP_LLM_MAX_TOKENS=4000
REACT_APP_LLM_TEMPERATURE=0.1
REACT_APP_LLM_REQUESTS_PER_MINUTE=60
REACT_APP_LLM_MAX_COST_PER_DAY=50

# Security
REACT_APP_LLM_ENABLE_SAFETY_CHECKS=true
REACT_APP_LLM_LOG_CONVERSATIONS=false
EOF
    echo "✅ Created .env.local with default configuration"
else
    echo "⚠️  .env.local already exists - please update it manually"
fi

echo ""
echo "🔑 NEXT STEPS:"
echo ""
echo "1. Choose your LLM provider:"
echo "   🥇 OpenAI GPT-4 (Recommended) - https://platform.openai.com/"
echo "   🥈 Anthropic Claude - https://console.anthropic.com/"
echo "   🥉 Google Gemini - https://ai.google.dev/"
echo ""

echo "2. Get your API key and update .env.local:"
echo "   - Replace 'your_openai_api_key_here' with your actual API key"
echo "   - Set usage limits to control costs"
echo ""

echo "3. Install the required SDK:"
echo "   For OpenAI:    npm install openai"
echo "   For Anthropic: npm install @anthropic-ai/sdk"
echo "   For Google:    npm install @google/generative-ai"
echo ""

echo "4. Test the integration:"
echo "   - Start your app: npm run dev"
echo "   - Go to Business Brain page"
echo "   - Try asking: 'Show me all customers'"
echo ""

echo "💰 COST ESTIMATES:"
echo "   Light usage (100 queries/day): $30-50/month"
echo "   Medium usage (500 queries/day): $150-250/month"
echo "   Heavy usage (2000+ queries/day): $500-1000/month"
echo ""

echo "🔒 SECURITY REMINDERS:"
echo "   - Never commit API keys to git"
echo "   - Set usage limits in your LLM provider dashboard"
echo "   - Monitor costs regularly"
echo "   - Use different keys for dev/staging/production"
echo ""

echo "🆘 NEED HELP?"
echo "   - Check docs/LLM_INTEGRATION_GUIDE.md for detailed instructions"
echo "   - OpenAI docs: https://platform.openai.com/docs"
echo "   - Anthropic docs: https://docs.anthropic.com/"
echo ""

echo "🎉 Ready to unleash the AI Business Brain!"
echo "   Once configured, your AI will be able to:"
echo "   • Generate SQL queries from natural language"
echo "   • Analyze business data and provide insights"
echo "   • Automate database operations safely"
echo "   • Provide intelligent business recommendations"
echo ""
