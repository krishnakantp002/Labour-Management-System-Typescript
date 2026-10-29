import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Tag, ArrowUpRight } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  rate_per_ton: string;
  effective_from: string;
  is_active: boolean;
}

export default function Products() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [productForm, setProductForm] = useState({ name: '' });
  const [rateForm, setRateForm] = useState({ ratePerTon: 0 });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/rates/products');
      return res.data.data as Product[];
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async () => {
      await api.post('/rates/products', { name: productForm.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setProductForm({ name: '' });
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      await api.post('/rates', {
        productId: selectedProduct.id,
        ratePerTon: Number(rateForm.ratePerTon)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsRateModalOpen(false);
      setSelectedProduct(null);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rates/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Products & Rates</h1>
          <p className="text-slate-500 mt-1">Manage product categories and update their daily rates.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedProduct(product);
                        setRateForm({ ratePerTon: Number(product.rate_per_ton) });
                        setIsRateModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg transition-colors"
                      title="Update Rate"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                          deleteProductMutation.mutate(product.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-1">{product.name}</h3>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">CURRENT RATE</p>
                    <p className="text-2xl font-bold text-slate-900">₹{product.rate_per_ton || '0'}<span className="text-sm text-slate-500 font-medium">/ton</span></p>
                  </div>
                </div>
              </div>
            ))}
            
            {products.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                No products found. Add one to get started!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Product</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input 
                  type="text" 
                  value={productForm.name}
                  onChange={e => setProductForm({ name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Iron Ore"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => createProductMutation.mutate()}
                  disabled={!productForm.name || createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? 'Saving...' : 'Add Product'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Rate Modal */}
      {isRateModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Update Rate</h2>
            <p className="text-sm text-slate-500 mb-5">Set a new rate for {selectedProduct.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Rate (₹ per ton)</label>
                <input 
                  type="number" 
                  value={rateForm.ratePerTon}
                  onChange={e => setRateForm({ ratePerTon: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsRateModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => updateRateMutation.mutate()}
                  disabled={rateForm.ratePerTon <= 0 || updateRateMutation.isPending}
                >
                  {updateRateMutation.isPending ? 'Saving...' : 'Update Rate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
