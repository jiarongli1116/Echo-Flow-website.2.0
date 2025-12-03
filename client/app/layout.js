import './globals.css'
import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import Script from 'next/script'
import { AuthProvider } from '@/hooks/use-auth'
import { ProductsProvider } from '@/hooks/use-product'
import { CouponsProvider } from '@/hooks/use-coupons'
import { ForumsProvider } from '@/hooks/use-forums'
import { HomeProvider } from '@/hooks/use-home'
import { CartProvider } from '@/hooks/use-cart'
import ConditionalLayout from '@/components/Layout/ConditionalLayout'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export const metadata = {
    title: 'Echo&Flow - Vinyl Records Shop',
    description: 'A vinyl record e-commerce platform',
}

export default function RootLayout({ children }) {
    return (
        <html lang="zh-TW">
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
                />
                <link rel="icon" href="/favicon.ico" />
                <link rel="shortcut icon" href="/favicon.ico" />
            </head>
            <body>
                <AuthProvider>
                    <CartProvider>
                        <HomeProvider>
                            <CouponsProvider>
                                <ProductsProvider>
                                    <ForumsProvider>
                                        <ConditionalLayout>
                                            {children}
                                        </ConditionalLayout>
                                    </ForumsProvider>
                                </ProductsProvider>
                            </CouponsProvider>
                        </HomeProvider>
                    </CartProvider>
                </AuthProvider>

                {/* ToastContainer for global notifications */}
                <ToastContainer
                    containerId="global-toast-container"
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                />

                {/* Bootstrap JavaScript */}
                <Script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
                    integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
                    crossOrigin="anonymous"
                />
            </body>
        </html>
    )
}
