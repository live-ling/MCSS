# MCSS - Minecraft Server Sharing Platform

A comprehensive platform for sharing and discovering Minecraft servers, built with React, TypeScript, and Supabase.

## Features

- 🎮 Minecraft server listing and discovery
- 👤 User authentication and profiles
- 📷 Server image uploads
- 🏷️ Server tagging and filtering
- ⭐ Server likes and favorites
- 💬 Server comments
- 📧 Email verification and password reset
- 🔍 Server status checking
- 🎨 Responsive design with dark mode support
- 👥 Admin and owner dashboards

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Storage, Functions)
- **UI Components**: Radix UI, Lucide React
- **Form Handling**: React Hook Form, Zod
- **Routing**: React Router

## Directory Structure

```
├── README.md              # Documentation
├── components.json        # UI component library configuration
├── index.html             # Entry point
├── package.json           # Package management
├── postcss.config.js      # PostCSS configuration
├── public                 # Static assets
│   ├── favicon.png        # Favicon
│   └── images             # Image assets
├── src                    # Source code
│   ├── components         # UI components
│   ├── contexts           # React contexts
│   ├── db                 # Database configuration
│   ├── hooks              # Custom hooks
│   ├── lib                # Utility functions
│   ├── pages              # Application pages
│   ├── services           # API services
│   ├── types              # TypeScript types
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry
│   ├── routes.tsx         # Route configuration
│   └── index.css          # Global styles
├── supabase               # Supabase configuration
│   ├── functions          # Edge functions
│   ├── migrations         # Database migrations
│   └── config.toml        # Supabase configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10 or pnpm ≥ 8
- Supabase account

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/live-ling/mcss.git
   cd mcss
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_APP_ID=app-9eou800gj85c
   VITE_FORM_ID=form-9eou800gj85c
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migration:
     ```bash
     supabase db push --file ./supabase/migrations/init.sql
     ```
   - Deploy the edge functions:
     ```bash
     supabase functions deploy
     ```

5. **Start the development server**
   ```bash
   pnpm run dev
   ```

## Deployment

### Deploying to GitHub

1. **Create a GitHub repository**
   - Go to [GitHub](https://github.com/new) and create a new repository
   - Push your code to the repository:
     ```bash
     git remote add origin https://github.com/live-ling/mcss.git
     git add .
     git commit -m "Initial commit"
     git push -u origin main
     ```

### Deploying to Cloudflare Pages

1. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)
   - Click "Create a project"
   - Connect your GitHub repository

2. **Configure build settings**
   - **Framework preset**: React
   - **Build command**: `pnpm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`

3. **Set up environment variables**
   - Add the following environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_APP_ID`
     - `VITE_FORM_ID`

4. **Deploy**
   - Click "Save and Deploy"
   - Wait for the deployment to complete

5. **Configure custom domain (optional)**
   - Go to your Pages project settings
   - Add a custom domain

## Database Configuration

The database schema is defined in `supabase/migrations/init.sql`. This file contains all the necessary tables, functions, and policies for the application.

### Tables

- `profiles` - User profiles
- `servers` - Minecraft servers
- `server_images` - Server images
- `server_tags` - Server tags
- `server_likes` - Server likes
- `server_favorites` - Server favorites
- `server_comments` - Server comments
- `server_reports` - Server reports
- `smtp_config` - SMTP configuration for emails
- `email_templates` - Email templates
- `verification_codes` - Verification codes
- `server_edit_requests` - Server edit requests
- `site_settings` - Site settings

## Supabase Functions

- `check-server-status` - Checks Minecraft server status
- `fetch-qq-avatar` - Fetches QQ avatar
- `query-mc-player` - Queries Minecraft player information
- `query-mc-server` - Queries Minecraft server information
- `query-my-ip` - Queries client IP address
- `send-email` - Sends emails
- `update-login-info` - Updates user login information

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_APP_ID` | Application ID | Yes |
| `VITE_FORM_ID` | Form ID | Yes |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Supabase](https://supabase.com/) for providing the backend infrastructure
- [Radix UI](https://www.radix-ui.com/) for the UI components
- [Tailwind CSS](https://tailwindcss.com/) for the styling
- [Lucide React](https://lucide.dev/) for the icons

## Support

If you have any questions or issues, please open an issue on GitHub or contact the maintainers.

---

**Happy Minecraft server sharing!** 🎮
