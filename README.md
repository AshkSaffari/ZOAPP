# CEWA - Autodesk Construction Cloud Integration

A comprehensive React application for integrating with Autodesk Construction Cloud (ACC) APIs, providing project management, reporting, and data visualization capabilities.

## 🚀 Features

### **Project Management**
- **Hub & Project Selection** - Browse and select from available ACC hubs and projects
- **Project Phase Management** - Set and track project phases with local persistence
- **Project Image Updates** - Update project images directly through the interface

### **Reporting & Analytics**
- **PDF Report Generation** - Create comprehensive project reports
- **Expense Tracking** - View project expenses from ACC Cost Management
- **Multi-Project Reports** - Generate reports for multiple projects simultaneously
- **Local Download** - Download reports as PDF files

### **ACC Integration**
- **OAuth 2.0 Authentication** - Secure 3-legged OAuth flow with Autodesk
- **Real-time Data Sync** - Live data from ACC APIs
- **Error Handling** - Comprehensive error handling and user feedback
- **Token Management** - Automatic token refresh and validation

## 🛠️ Technology Stack

- **Frontend:** React 18, JavaScript ES6+
- **UI Framework:** Tailwind CSS
- **Icons:** Lucide React
- **PDF Generation:** jsPDF
- **HTTP Client:** Fetch API with CORS handling
- **State Management:** React Hooks (useState, useEffect, useCallback)
- **Local Storage:** Persistent data storage for project phases

## 📋 Prerequisites

- Node.js 16+ and npm
- Autodesk Developer Account
- ACC (Autodesk Construction Cloud) account with project access
- Modern web browser with JavaScript enabled

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/AshSaffari/ACC-Autodesk.git
cd ACC-Autodesk
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Autodesk Credentials
1. Register your app at [Autodesk Forge](https://forge.autodesk.com/)
2. Get your Client ID and Client Secret
3. Set up OAuth callback URL: `http://localhost:3001/callback`

### 4. Start Development Server
```bash
npm start
```

### 5. Access the Application
Open [http://localhost:3001](http://localhost:3001) in your browser

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
REACT_APP_CLIENT_ID=your_client_id_here
REACT_APP_CLIENT_SECRET=your_client_secret_here
REACT_APP_CALLBACK_URL=http://localhost:3001/callback
```

### OAuth Setup
1. **Client ID & Secret:** Get from Autodesk Forge Developer Portal
2. **Callback URL:** Must match your registered callback URL
3. **Scopes:** `data:read`, `data:write`, `data:create`

## 📖 API Integration

### **Supported ACC APIs**
- **Project Management API** - Hub and project data
- **Cost Management API** - Expense tracking and financial data
- **Data Management API** - File and folder operations
- **Issues API** - Project issue management (read-only)

### **API Endpoints Used**
- `GET /project/v1/hubs` - List available hubs
- `GET /project/v1/hubs/{hubId}/projects` - List projects in hub
- `GET /cost/v1/containers/{containerId}/expenses` - Get project expenses
- `PUT /project/v1/projects/{projectId}/image` - Update project image

## 🎯 Usage Guide

### **1. Authentication**
- Click "Sign In" to authenticate with Autodesk
- Complete OAuth flow in popup window
- Tokens are automatically managed and refreshed

### **2. Project Selection**
- Select a hub from the dropdown
- Choose projects from the project list
- View project details and current phase

### **3. Phase Management**
- Set project phases using the dropdown
- Phases are saved locally and persist across sessions
- View phase information in reports

### **4. Report Generation**
- Select projects for reporting
- Choose report type (PDF download)
- Generate and download comprehensive reports

### **5. Expense Tracking**
- View project expenses in the Reports tab
- Expenses are fetched from ACC Cost Management
- Real-time data updates

## 🔒 Security Features

- **OAuth 2.0** - Industry-standard authentication
- **Token Security** - Secure token storage and management
- **CORS Handling** - Proper cross-origin request handling
- **Input Validation** - Client-side validation for all inputs
- **Error Boundaries** - Graceful error handling

## 🐛 Troubleshooting

### **Common Issues**

**Authentication Errors:**
- Verify Client ID and Secret are correct
- Check callback URL matches registered URL
- Ensure OAuth scopes are properly configured

**API Errors:**
- Check network connectivity
- Verify ACC project permissions
- Review browser console for detailed error messages

**CORS Issues:**
- Use development server (localhost:3001)
- Check browser CORS settings
- Verify API endpoint accessibility

### **Debug Mode**
Enable debug logging by opening browser console and looking for detailed API call information.

## 📊 Project Structure

```
src/
├── components/          # React components
│   ├── App.js          # Main application component
│   ├── PhaseManager.js # Project phase management
│   └── ReportTab.js    # Reporting functionality
├── services/           # API services
│   ├── AccService.js   # Main ACC API service
│   └── LocalPhaseService.js # Local storage service
└── styles/            # CSS and styling
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ash Saffari**
- Email: khashayar.saffari@gmail.com
- GitHub: [@AshSaffari](https://github.com/AshSaffari)

## 🙏 Acknowledgments

- Autodesk Forge Platform
- Autodesk Construction Cloud APIs
- React Community
- Open source contributors

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact: khashayar.saffari@gmail.com
- Autodesk Forge Documentation: https://forge.autodesk.com/

---

**Built with ❤️ for the Autodesk Construction Cloud ecosystem**

