import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const addProduct = async (productId: number) => {
		try {
			const productCart = cart.find(product => product.id === productId);

			if (productCart) {
				const response = await api.get(`/stock/${productId}`);
				const stock = response.data;

				const newAmount = productCart.amount + 1;

				if (newAmount > stock.amount) {
					toast.error('Quantidade solicitada fora de estoque');
					return;
				}

				const updatedCart = cart.map(product => {
					if (product.id === productId) {
						return {
							...product,
							amount: newAmount,
						}
					} else {
						return product;
					}
				});

				setCart(updatedCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

			} else {
				await api.get(`/products/${productId}`)
					.then(response => {
						const product = {
							...response.data,
							amount: 1,
						}

						const updatedCart = [...cart, product];

						setCart(updatedCart);
						localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
					});
			}			
				
		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const productCart = cart.find(product => product.id === productId);

			if (!productCart) {
				toast.error('Erro na remoção do produto');
				return;
			}

			const filteredCart = cart.filter(product => product.id !== productId);

			setCart(filteredCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart));

		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			if (amount < 1)
				return;

			const productCart = cart.find(product => product.id === productId);

			if (!productCart) {
				toast.error('Erro na alteração de quantidade do produto');
				return;
			}

			const response = await api.get(`/stock/${productId}`);
			const stock = response.data;

			if (amount > stock.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			const updatedCart = cart.map(product => {
				if (product.id === productId) {
					return {
						...product,
						amount,
					}
				} else {
					return product;
				}
			});

			setCart(updatedCart);

			localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
