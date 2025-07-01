import { useState, useEffect } from 'react';
import { FileText, ChevronRight, Calendar, User, Building2, DollarSign } from 'lucide-react';

// Define PO-specific types
interface Vendor {
  id: string;
  name: string;
  category: string;
  trustLevel: string;
  paymentTerms: string;
}

interface POLineItem {
  id: string;
  lineNumber: number;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityInvoiced: number;
  unitPrice: number;
  totalAmount: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  totalAmount: number;
  status: string;
  createdDate: string;
  approvalDate?: string;
  requester: string;
  department: string;
  vendor: Vendor;
  lineItems?: POLineItem[];
  _count?: {
    invoices: number;
    lineItems: number;
  };
}

interface POListProps {
  onSelectPO: (po: PurchaseOrder) => void;
}

export default function POList({ onSelectPO }: POListProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/purchase-orders');
      if (!response.ok) {
        throw new Error('Failed to fetch purchase orders');
      }
      const data = await response.json();
      setPurchaseOrders(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { text: string; className: string }> = {
      'pending': { text: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      'approved': { text: 'Approved', className: 'bg-green-100 text-green-700' },
      'rejected': { text: 'Rejected', className: 'bg-red-100 text-red-700' },
      'partially_received': { text: 'Partial', className: 'bg-blue-100 text-blue-700' },
      'completed': { text: 'Completed', className: 'bg-gray-100 text-gray-700' }
    };
    
    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getOutstandingAmount = (po: PurchaseOrder) => {
    // Calculate outstanding amounts (this would be more complex with real data)
    const receivedPercentage = Math.random() * 0.3 + 0.7; // 70-100% received for demo
    const invoicedPercentage = Math.random() * 0.2 + 0.5; // 50-70% invoiced for demo
    const outstanding = po.totalAmount * (1 - invoicedPercentage);
    
    return {
      outstanding: outstanding,
      receivedPercentage: receivedPercentage * 100,
      invoicedPercentage: invoicedPercentage * 100
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading purchase orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading purchase orders: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="mt-1 text-sm text-gray-600">Manage purchase orders and track delivery status</p>
      </div>

      {/* PO Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total POs</p>
              <p className="text-2xl font-semibold text-gray-900">{purchaseOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {purchaseOrders.filter(po => po.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vendors</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(purchaseOrders.map(po => po.vendorId)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Status</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchaseOrders.map((po) => {
                const outstanding = getOutstandingAmount(po);
                return (
                  <tr 
                    key={po.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectPO(po)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{po.poNumber}</div>
                          <div className="text-sm text-gray-500">{formatDate(po.createdDate)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-gray-900">{po.vendor.name}</div>
                        <div className="text-sm text-gray-500">{po.vendor.category}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(po.totalAmount)}</div>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(po.status)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Received</span>
                          <span className="font-medium">{outstanding.receivedPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${outstanding.receivedPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{formatCurrency(outstanding.outstanding)}</div>
                        <div className="text-gray-500">remaining</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}