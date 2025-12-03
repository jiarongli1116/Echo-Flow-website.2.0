'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';

// 購物車上下文
const CartContext = createContext();

// 購物車 Reducer
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      console.log('🔄 ADD_ITEM action:', action.payload);
      console.log('🔄 Current state items:', state.items);

      const existingItem = state.items.find(
        (item) => item.id === action.payload.id,
      );

      if (existingItem) {
        console.log('🔄 商品已存在，增加數量');
        const newState = {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
        console.log('🔄 New state:', newState);
        return newState;
      }

      console.log('🔄 新增商品到購物車');
      const newState = {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
      console.log('🔄 New state:', newState);
      return newState;

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item,
        ),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };

    default:
      return state;
  }
}

// 初始狀態
const initialState = {
  items: [],
};

// 購物車提供者組件
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback((product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  }, []);

  const removeItem = useCallback((id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // 計算總計
  const getCartTotal = () => {
    return state.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  };

  // 獲取商品總數
  const getItemCount = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    items: state.items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// 使用購物車上下文的 Hook
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
