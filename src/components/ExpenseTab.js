import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Download, Search, RefreshCw, CheckCircle, AlertCircle, Upload, Paperclip, X, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import AccService from '../services/AccService';

const ExpenseTab = ({ projects, credentials }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // State for project selection - single project dropdown
  const [selectedProject, setSelectedProject] = useState('');
  
  // State for expenses
  const [projectExpenses, setProjectExpenses] = useState({});
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  
  // State for file attachments
  const [expenseAttachments, setExpenseAttachments] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  // Load expenses for ALL projects
  const loadExpensesForAllProjects = useCallback(async () => {
    if (projects.length === 0) {
      setProjectExpenses({});
      return;
    }

    setIsLoadingExpenses(true);
    setError(null);

    try {
      AccService.initialize(credentials);
      const expensesData = {};

      for (const project of projects) {
        try {
          console.log(`💰 Loading expenses for project: ${project.name} (${project.id})`);
          
          // Detect region for this project's hub
          if (project.relationships?.hub?.data?.id) {
            console.log(`🔍 Detecting region for project ${project.name} hub: ${project.relationships.hub.data.id}`);
            await AccService.detectRegion(project.relationships.hub.data.id);
          }
          
          const expenses = await AccService.getExpenses(project.id);
          
          // For each expense, fetch its items to get actual amounts
          const expensesWithItems = await Promise.all(
            (expenses || []).map(async (expense) => {
              try {
                console.log(`🔍 Fetching items for expense: ${expense.id}`);
                const items = await AccService.getExpenseItems(project.id, expense.id);
                console.log(`✅ Found ${items?.length || 0} items for expense ${expense.id}`);
                
                // Debug: Log the structure of the first item
                if (items && items.length > 0) {
                  console.log(`🔍 First expense item structure:`, {
                    item: items[0],
                    allKeys: Object.keys(items[0] || {}),
                    attributesKeys: items[0]?.attributes ? Object.keys(items[0].attributes) : 'No attributes'
                  });
                  
                  // Debug: Check for amount fields
                  const firstItem = items[0];
                  console.log(`💰 Amount fields in first item:`, {
                    amount: firstItem.attributes?.amount,
                    totalAmount: firstItem.attributes?.totalAmount,
                    unitAmount: firstItem.attributes?.unitAmount,
                    quantity: firstItem.attributes?.quantity,
                    allAttributes: firstItem.attributes
                  });
                } else {
                  console.log(`⚠️ No items found for expense ${expense.id}`);
                }

                // Load attachments for this expense
                try {
                  const attachments = await AccService.getExpenseAttachments(project.id, expense.id);
                  console.log(`📎 Found ${attachments?.length || 0} attachments for expense ${expense.id}`);
                  
                  // Update local state with loaded attachments
                  setExpenseAttachments(prev => ({
                    ...prev,
                    [expense.id]: attachments || []
                  }));
                } catch (attachmentError) {
                  console.error(`❌ Error loading attachments for expense ${expense.id}:`, attachmentError);
                }
                
                // Calculate total amount from items
                const totalAmount = (items || []).reduce((sum, item) => {
                  const amount = parseFloat(
                    item.amount ||
                    item.attributes?.amount ||
                    item.attributes?.totalAmount ||
                    item.totalAmount ||
                    item.value ||
                    item.attributes?.value ||
                    item.attributes?.cost ||
                    item.cost ||
                    item.attributes?.price ||
                    item.price ||
                    0
                  );
                  
                  console.log(`💰 Item amount calculation:`, {
                    itemId: item.id,
                    itemName: item.name || item.title,
                    amount,
                    rawItem: item,
                    possibleAmounts: {
                      amount: item.amount,
                      attributes_amount: item.attributes?.amount,
                      attributes_totalAmount: item.attributes?.totalAmount,
                      totalAmount: item.totalAmount,
                      value: item.value,
                      attributes_value: item.attributes?.value,
                      attributes_cost: item.attributes?.cost,
                      cost: item.cost,
                      attributes_price: item.attributes?.price,
                      price: item.price
                    }
                  });
                  
                  return sum + amount;
                }, 0);
                
                console.log(`💰 Expense ${expense.id} total from items: $${totalAmount.toFixed(2)}`);
                
                return {
                  ...expense,
                  items: items || [],
                  calculatedAmount: totalAmount
                };
              } catch (itemError) {
                console.warn(`⚠️ Failed to fetch items for expense ${expense.id}:`, itemError.message);
                return {
                  ...expense,
                  items: [],
                  calculatedAmount: 0
                };
              }
            })
          );
          
          expensesData[project.id] = expensesWithItems;
          console.log(`✅ Found ${expensesWithItems?.length || 0} expenses for project ${project.name}`);
          console.log(`📊 Expense data sample:`, expensesWithItems?.slice(0, 2));
        } catch (err) {
          console.error(`❌ Error loading expenses for project ${project.name}:`, err);
          expensesData[project.id] = [];
        }
      }

      setProjectExpenses(expensesData);
      console.log('📊 All expenses loaded for all projects:', expensesData);
      
      // Debug: Log total amounts for each project
      Object.entries(expensesData).forEach(([projectId, expenses]) => {
        const total = expenses.reduce((sum, expense) => {
          return sum + (expense.calculatedAmount || 0);
        }, 0);
        console.log(`💰 Project ${projectId} total amount: $${total.toFixed(2)}`);
      });
    } catch (err) {
      console.error('❌ Error loading expenses:', err);
      setError('Failed to load expenses');
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [projects, credentials]);

  // Load expenses when projects change
  useEffect(() => {
    console.log('🔄 ExpenseTab useEffect triggered - projects changed:', {
      projectsCount: projects.length,
      projects: projects.map(p => ({ id: p.id, name: p.name }))
    });
    loadExpensesForAllProjects();
  }, [loadExpensesForAllProjects]);

  // Calculate project totals
  const calculateProjectTotals = (projectId) => {
    const expenses = projectExpenses[projectId] || [];
    console.log(`🧮 Calculating totals for project ${projectId}:`, {
      expensesCount: expenses.length,
      expenses: expenses.slice(0, 3),
      projectExpenses: projectExpenses
    });

    // Debug: Log the full structure of the first expense
    if (expenses.length > 0) {
      console.log(`🔍 Full expense structure for project ${projectId}:`, {
        firstExpense: expenses[0],
        allKeys: Object.keys(expenses[0] || {}),
        attributesKeys: expenses[0]?.attributes ? Object.keys(expenses[0].attributes) : 'No attributes',
        customFieldsKeys: expenses[0]?.customFields ? Object.keys(expenses[0].customFields) : 'No customFields'
      });
    }

    const total = expenses.reduce((sum, expense) => {
      // Use calculatedAmount from items if available, otherwise try other fields
      let amount = 0;
      
      if (expense.calculatedAmount !== undefined && expense.calculatedAmount > 0) {
        amount = expense.calculatedAmount;
      } else {
        // Fallback to trying other amount fields
        const possibleAmounts = [
          expense.amount,
          expense.attributes?.amount,
          expense.attributes?.totalAmount,
          expense.totalAmount,
          expense.value,
          expense.attributes?.value,
          expense.attributes?.cost,
          expense.cost,
          expense.attributes?.price,
          expense.price,
          expense.attributes?.unitCost,
          expense.unitCost,
          expense.attributes?.lineTotal,
          expense.lineTotal,
          expense.attributes?.extendedAmount,
          expense.extendedAmount
        ];

        amount = parseFloat(possibleAmounts.find(a => a !== undefined && a !== null && a !== '') || 0);
      }
      
      console.log(`💰 Expense amount calculation:`, {
        expenseId: expense.id,
        expenseName: expense.name || expense.title,
        amount,
        calculatedAmount: expense.calculatedAmount,
        itemsCount: expense.items?.length || 0,
        rawExpense: expense
      });
      
      return sum + amount;
    }, 0);

    const count = expenses.length;
    console.log(`📊 Project ${projectId} totals:`, { total, count });
    return { total, count };
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    let totalAmount = 0;
    let totalCount = 0;

    projects.forEach(project => {
      const { total, count } = calculateProjectTotals(project.id);
      totalAmount += total;
      totalCount += count;
    });

    return { totalAmount, totalCount };
  };

  // Handle project selection from dropdown
  const handleProjectSelect = (projectId) => {
    setSelectedProject(projectId);
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter(project => 
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle file attachment and upload to ACC
  const handleFileAttachment = async (expenseId, projectId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      setUploadingFiles(prev => ({ ...prev, [expenseId]: true }));

      try {
        console.log('🚀 Starting file upload process...', { expenseId, projectId, fileCount: files.length });
        
        // Upload each file to ACC
        const uploadPromises = files.map(async (file, index) => {
          try {
            console.log(`📤 Uploading file ${index + 1}/${files.length}: ${file.name}`);
            const fileName = `${expenseId}_${file.name}`;
            const result = await AccService.uploadExpenseAttachment(projectId, expenseId, file, fileName);
            console.log(`✅ File ${index + 1} uploaded successfully:`, result);
            return {
              ...result,
              originalName: file.name,
              size: file.size,
              type: file.type
            };
          } catch (fileError) {
            console.error(`❌ Error uploading file ${file.name}:`, fileError);
            throw new Error(`Failed to upload ${file.name}: ${fileError.message}`);
          }
        });

        const uploadResults = await Promise.all(uploadPromises);
        console.log('🎉 All files uploaded successfully:', uploadResults);

        // Update local state with uploaded files
        setExpenseAttachments(prev => ({
          ...prev,
          [expenseId]: [...(prev[expenseId] || []), ...uploadResults]
        }));

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        console.error('❌ Error uploading files to ACC:', err);
        setError('Failed to upload files to ACC: ' + err.message);
        alert('Upload failed: ' + err.message);
      } finally {
        setUploadingFiles(prev => ({ ...prev, [expenseId]: false }));
      }
    };

    input.click();
  };

  // Load existing attachments for an expense
  const loadExpenseAttachments = async (expenseId, projectId) => {
    try {
      const attachments = await AccService.getExpenseAttachments(projectId, expenseId);
      setExpenseAttachments(prev => ({
        ...prev,
        [expenseId]: attachments
      }));
    } catch (error) {
      console.error('Error loading expense attachments:', error);
    }
  };

  // Remove file attachment
  const handleRemoveAttachment = (expenseId, fileIndex) => {
    setExpenseAttachments(prev => ({
      ...prev,
      [expenseId]: prev[expenseId]?.filter((_, index) => index !== fileIndex) || []
    }));
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Project Expenses Report', 20, 20);
    
    let y = 40;
    projects.forEach(project => {
      const { total, count } = calculateProjectTotals(project.id);
      doc.setFontSize(12);
      doc.text(`${project.name}: $${total.toFixed(2)} (${count} expenses)`, 20, y);
      y += 10;
    });
    
    const { totalAmount, totalCount } = calculateGrandTotal();
    doc.setFontSize(14);
    doc.text(`Grand Total: $${totalAmount.toFixed(2)} (${totalCount} total expenses)`, 20, y + 10);
    
    doc.save('project-expenses.pdf');
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Project Name', 'Total Amount', 'Expense Count'];
    const csvContent = [
      headers.join(','),
      ...projects.map(project => {
        const { total, count } = calculateProjectTotals(project.id);
        return [
          `"${project.name || ''}"`,
          total.toFixed(2),
          count
        ].join(',');
      }),
      `"Grand Total","${calculateGrandTotal().totalAmount.toFixed(2)}","${calculateGrandTotal().totalCount}"`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project-expenses.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Receipt className="h-6 w-6 text-green-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Project Expenses</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={loadExpensesForAllProjects}
            disabled={isLoadingExpenses}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingExpenses ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-800">Files attached successfully!</p>
          </div>
        </div>
      )}

      {/* Project Selection Dropdown */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Select Project to View Detailed Expenses
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => {
                const { total, count } = calculateProjectTotals(project.id);
                return (
                  <option key={project.id} value={project.id}>
                    {project.name} - ${total.toFixed(2)} ({count} expenses)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Single Summary - All Projects */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Expense Summary - All Projects
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const { total, count } = calculateProjectTotals(project.id);
              return (
                <div key={project.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {project.jobNumber && `Job: ${project.jobNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${total.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {count} expenses
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Grand Total</h4>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ${calculateGrandTotal().totalAmount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  {calculateGrandTotal().totalCount} total expenses
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Project Expenses - Only if Project Selected */}
      {!selectedProject ? (
        <div className="text-center py-8 text-gray-500">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h4>
          <p>Please select a project from the dropdown above to view its detailed expenses.</p>
        </div>
      ) : (() => {
        const project = projects.find(p => p.id === selectedProject);
        if (!project) return null;

        const expenses = projectExpenses[project.id] || [];
        const { total, count } = calculateProjectTotals(project.id);

        console.log(`📊 Selected Project: ${project.name} (${project.id})`);
        console.log(`📊 Expenses: ${expenses.length}`, expenses);

        return (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {project.name} - Detailed Expenses
              </h3>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  Total: ${total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {count} expenses
                </p>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No expenses found for this project.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense, index) => {
                  const expenseAmount = parseFloat(
                    expense.amount ||
                    expense.attributes?.amount ||
                    expense.attributes?.totalAmount ||
                    expense.totalAmount ||
                    expense.value ||
                    expense.attributes?.value ||
                    0
                  );

                  const attachments = expenseAttachments[expense.id] || [];
                  const isUploading = uploadingFiles[expense.id] || false;

                  return (
                    <div key={expense.id || index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {expense.name || expense.title || `Expense ${index + 1}`}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {expense.description || 'No description available'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Status: {expense.status || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ${expense.calculatedAmount ? expense.calculatedAmount.toFixed(2) : expenseAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {expense.type || 'Expense'}
                            {expense.items?.length > 0 && ` (${expense.items.length} items)`}
                          </p>
                        </div>
                      </div>

                      {/* File Attachment Section */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Attachments ({attachments.length})
                            </span>
                          </div>
                          <button
                            onClick={() => handleFileAttachment(expense.id, project.id)}
                            disabled={isUploading}
                            className="flex items-center px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            {isUploading ? 'Pushing to ACC...' : 'Push to ACC'}
                          </button>
                        </div>

                        {/* Display Attached Files */}
                        {attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {attachments.map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center justify-between bg-white rounded px-2 py-1">
                                <div className="flex items-center space-x-2">
                                  <Paperclip className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-600 truncate">
                                    {file.originalName || file.name}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                  {file.success && (
                                    <span className="text-xs text-green-600 font-medium">
                                      ✓ Uploaded to ACC
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1">
                                  {file.fileUrl && (
                                    <a
                                      href={file.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-700"
                                      title="View in ACC"
                                    >
                                      <Download className="h-3 w-3" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleRemoveAttachment(expense.id, fileIndex)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Remove attachment"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default ExpenseTab;