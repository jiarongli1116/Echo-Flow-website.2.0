'use client'

import { redirect, useParams } from 'next/navigation'
import { useContext, createContext, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

// 獲取 token 的函數
const getToken = () => {
    return localStorage.getItem('reactLoginToken')
}

const CouponsContext = createContext(null)
CouponsContext.displayName = 'CouponsContext'
export function CouponsProvider({ children }) {
    const [coupons, setCoupons] = useState([])
    const [coupon, setCoupon] = useState([])
    const [userCoupons, setUserCoupons] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [pagination, setPagination] = useState([])

    const params = useParams()

    // - 優惠券頁面
    const couponsPage = async (
        page = 1,
        account = null,
        tg_type = null,
        tg_class = null
    ) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons?page=${page}`

        if (tg_type) {
            API += `&tg_type=${tg_type}`
        }
        if (tg_class) {
            API += `&tg_class=${tg_class}`
        }
        if (account) {
            API += `&account=${account}`
        }
        try {
            const res = await fetch(API)
            const result = await res.json()

            if (result.status == 'success') {
                console.log(result)
                console.log(result.data)
                console.log(result.pagination)

                setCoupons(result.data)
                setPagination(result.pagination)
            } else {
                setCoupons([])
                setPagination(null)

                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`優惠券頁面取得失敗: ${error.message}`)
            setCoupons([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    // - 使用者優惠券頁面
    const userCouponsPage = async (page = 1, account, type = null) => {
        setIsLoading(true)

        let API = `http://localhost:3005/api/coupons/${account}`

        // console.log(type)

        if (page) {
            API += `?page=${page}`
        }
        if (type) {
            API += `&user_type=${type}`
        }
        console.log(API)

        try {
            const token = getToken()
            const res = await fetch(API, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                setUserCoupons(result.data)
                setPagination(result.pagination)
            } else {
                setUserCoupons(null)
                setPagination(null)
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`${account}使用優惠券頁面取得失敗: ${error.message}`)
            //  alert(error.message);
            setUserCoupons(null)
            setPagination(null)
        } finally {
            setIsLoading(false)
        }
    }

    // - 使用者獲得優惠券
    const userGetCoupon = async (account, code) => {
        setIsLoading(true)
        if (!account) {
            Swal.fire({
                title: 'Error!',
                text: '請登入您的帳號',
                icon: 'error',
                confirmButtonText: '關閉',
            }).then((result) => {
                console.log('Close')
                if (result) {
                    redirect('/auth/login')
                }
            })
            // alert('請登入')
            // redirect('/auth/login')
            return
        }
        if (!code) {
            toast.error('領取優惠券失敗，請輸入優惠券代碼', {
                containerId: 'global-toast-container',
            })
            return
        }

        const API = `http://localhost:3005/api/coupons/${account}/${code}`

        try {
            const token = getToken()
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                console.log(`${account}獲得 ${result.data.name} 優惠券成功`)
                toast.success(`成功領取 ${result.data.name} 優惠券 🎉`, {
                    containerId: 'global-toast-container',
                })
            } else {
                toast.warn(result.message)
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`${account}獲得優惠券失敗: ${error.message}`)
            toast.error('領取優惠券失敗，請稍後再試', {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 使用者獲得所有優惠券
    const userGetAll = async (account, tg_type = null, tg_class = null) => {
        setIsLoading(true)
        if (!account) {
            Swal.fire({
                title: 'Error!',
                text: '請登入您的帳號',
                icon: 'error',
                confirmButtonText: '關閉',
            }).then((result) => {
                console.log('Close')
                if (result) {
                    redirect('/auth/login')
                }
            })
            // alert('請登入')
            // redirect('/auth/login')
            return
        }

        let API = `http://localhost:3005/api/coupons/${account}/all`
        const params = []

        if (tg_type) params.push(`tg_type=${tg_type}`)
        if (tg_class) params.push(`tg_class=${tg_class}`)

        if (params.length > 0) {
            API += '?' + params.join('&')
        }
        try {
            console.log(account, tg_type, tg_class)

            const token = getToken()
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                toast.success(`成功領取 ${result.data.length} 張優惠券 🎉`, {
                    containerId: 'global-toast-container',
                })
                console.log(`${result.message}`)
            } else {
                toast.warn(`失敗: ${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`${account}獲得優惠券失敗: ${error.message}`)
            toast.error('領取優惠券失敗，請稍後再試', {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 購車使用優惠券
    const couponUse = async (account, code, cart) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/${account}/${code}/${cart}`

        try {
            const token = getToken()
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                console.log(`${result.message}`)
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`${account}獲得優惠券失敗: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    // - 新增優惠券
    const couponAdd = async (couponData) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/add`

        // console.log(couponData)

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(couponData),
            })
            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                toast.success(
                    `成功新增優惠券：${couponData.name || couponData.code}`,
                    {
                        containerId: 'global-toast-container',
                    }
                )

                return result
                // console.log(`${result.message}`)
            } else {
                toast.warn(`新增失敗：${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            // console.log(`新增${couponData.code}優惠券失敗: ${error.message}`)
            toast.error(`新增優惠券失敗：${error.message}`, {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 優惠券狀態
    const couponStatus = async (code) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/status`

        console.log(code)

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code }),
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                // console.log(`${result.message}`)
                toast.success(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
            } else {
                toast.warn(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            // console.log(`改變${code}優惠券狀態失敗: ${error.message}`)
            toast.error(`改變${code}優惠券狀態失敗`, {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 優惠券獲取
    const couponGet = async (code) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/edit/${code}`

        console.log(code)

        try {
            const res = await fetch(API)
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                // console.log(`${result.message}`)
                setCoupon(result.data)
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            // console.log(`改變${code}優惠券狀態失敗: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    // - 修改優惠券
    const couponEdit = async (couponData) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/edit/${couponData.code}`

        console.log(couponData)

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(couponData),
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                // console.log(`${result.message}`)
                toast.success(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
            } else {
                toast.warn(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            // console.log(`修改${couponData.name}優惠券失敗: ${error.message}`)
            toast.error(`修改${couponData.name}優惠券失敗`, {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 優惠券下架
    const couponValid = async (code) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/valid`

        console.log(code)

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code }),
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                // console.log(`${result.message}`)
                toast.success(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
            } else {
                toast.warn(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            // console.log(`下嫁${code}優惠券失敗: ${error.message}`)
            toast.error(`下架${code}優惠券失敗`, {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 優惠券所選狀態
    const couponsAllStatus = async (codes, status) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/status/all`

        console.log(codes)

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ codes: codes, status: status }),
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                // console.log(`${result.message}`)
                toast.success(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
            } else {
                toast.warn(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            // console.log(`改變${code}優惠券狀態失敗: ${error.message}`)
            toast.error(`改變所選優惠券狀態失敗`, {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // - 優惠券所選下架
    const couponsAllValid = async (codes) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/coupons/admin/valid/all`

        console.log(codes)

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ codes: codes }),
            })
            const result = await res.json()
            console.log(result)

            if (result.status == 'success') {
                // console.log(`${result.message}`)
                toast.success(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
            } else {
                toast.warn(`${result.message}`, {
                    containerId: 'global-toast-container',
                })
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`下架所選優惠券失敗: ${error.message}`)
            toast.error(`下架所選優惠券失敗`, {
                containerId: 'global-toast-container',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <CouponsContext.Provider
            value={{
                coupons,
                isLoading,
                userCoupons,
                pagination,
                couponsPage,
                userCouponsPage,
                userGetCoupon,
                userGetAll,
                couponUse,
                couponAdd,
                couponStatus,
                couponGet,
                coupon,
                couponEdit,
                couponValid,
                couponsAllStatus,
                couponsAllValid,
            }}
        >
            {children}
        </CouponsContext.Provider>
    )
}

export const useCoupons = () => useContext(CouponsContext)
