import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

/**
 * Reducer du panier (Context API).
 * Actions : ADD_TO_CART, DECREMENT_QUANTITY (minimum 1), REMOVE_FROM_CART, CLEAR_CART,
 * SET_SHIPPING_METHOD, SET_PAYMENT_METHOD, SET_SHIPPING_ADDRESS.
 * Chaque action renvoie un nouvel état sans modifier l'ancien (immutabilité).
 *
 * @param {object} state - État courant { cart, shippingMethod, paymentMethod, shippingAddress }.
 * @param {{type: string, payload?: any}} action - Action à appliquer.
 * @returns {object} Nouvel état.
 */
export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingProductIndex = state.cart.findIndex((item) => item.id === action.payload.id);

      if (existingProductIndex >= 0) {
        // Copie immuable de l'article : ne jamais modifier l'objet de l'état précédent
        const updatedCart = state.cart.map((item, index) =>
          index === existingProductIndex
            ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
            : item
        );
        return { ...state, cart: updatedCart };
      } else {
        return {
          ...state,
          cart: [...state.cart, { ...action.payload, quantity: 1 }],
        };
      }

    case 'DECREMENT_QUANTITY':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(item.quantity - 1, 1) } // Ne peut pas être inférieur à 1
            : item
        ),
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload.id),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'SET_SHIPPING_METHOD':
      return { ...state, shippingMethod: action.payload };

    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_SHIPPING_ADDRESS':
      return { ...state, shippingAddress: action.payload };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [cartState, dispatch] = useReducer(cartReducer, {
    cart: [],
    // Valeurs par défaut identiques à la première option affichée dans les <select>
    shippingMethod: 'colissimo',
    paymentMethod: 'Carte bancaire',
    shippingAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    },
  });

  return <CartContext.Provider value={{ ...cartState, dispatch }}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
