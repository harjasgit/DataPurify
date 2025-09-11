# DataClean AI - Data Cleaning Application

A modern SaaS data cleaning application with AI-powered suggestions, built with React and Express. Features drag-drop uploads, smart data preview, and one-click data fixes.

## Features

- **File Upload**: Drag & drop CSV/Excel files (max 30MB)
- **Smart Data Analysis**: Automatic detection of data quality issues
- **AI-Powered Suggestions**: Intelligent recommendations for data cleaning
- **One-Click Fixes**: Automated solutions for common data problems
- **Quality Score**: Real-time data quality assessment (0-100%)
- **Smart Preview**: Highlights problematic cells with color coding
- **Dark/Light Mode**: Complete theming support
- **Export**: Download cleaned data in CSV or Excel format

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- Wouter for routing
- TanStack Query for state management
- React Dropzone for file uploads

### Backend
- Node.js + Express
- TypeScript
- Multer for file handling
- CSV-parser for CSV files
- XLSX for Excel files
- In-memory storage (easily replaceable with database)

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone/Extract the project**
   ```bash
   cd data-cleaning-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities
│   │   └── hooks/       # Custom hooks
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Data storage interface
│   └── vite.ts          # Vite integration
├── shared/              # Shared types and schemas
└── package.json         # Dependencies and scripts
```

## API Endpoints

- `POST /api/upload` - Upload and analyze file
- `GET /api/files/:id` - Get file data
- `POST /api/files/:id/clean` - Apply cleaning operations
- `GET /api/files/:id/export` - Export cleaned data

## Data Cleaning Features

### Automatic Detection
- Missing values
- Duplicate rows
- Inconsistent date formats
- Invalid phone numbers
- Malformed email addresses

### One-Click Fixes
- Remove duplicate entries
- Fill missing values
- Standardize date formats
- Format phone numbers
- Clean email addresses

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Create a `.env` file:
```
NODE_ENV=production
PORT=5000
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## Database Integration

The application uses in-memory storage by default. To integrate with a database:

1. **Install database dependencies**
   ```bash
   npm install @neondatabase/serverless drizzle-orm
   ```

2. **Update the storage implementation** in `server/storage.ts`

3. **Run database migrations**
   ```bash
   npx drizzle-kit migrate
   ```

## Customization

### Styling
- Colors and themes: `client/src/index.css`
- Tailwind config: `tailwind.config.ts`

### Data Processing
- Analysis logic: `server/routes.ts` (DataProcessor class)
- Add new issue types in `shared/schema.ts`

### UI Components
- Built with shadcn/ui components
- Fully customizable in `client/src/components/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub

---

Built with ❤️ using modern web technologies