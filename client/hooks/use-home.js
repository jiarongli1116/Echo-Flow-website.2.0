'use client'

import { useParams } from 'next/navigation'
import { useContext, createContext, useState, useEffect } from 'react'

const HomeContext = createContext(null)
HomeContext.displayName = 'HomeContext'
export function HomeProvider({ children }) {
    const [motion, setMotion] = useState([])
    const [motion2, setMotion2] = useState([])
    const [category, setCategory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [sales, setSales] = useState([])
    const [recommend, setRecommend] = useState([])
    const [news, setNews] = useState([])
    const [rank, setRank] = useState([])
    const [shop, setShop] = useState([])

    const params = useParams()

    const motionFilm = async () => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/home/header`

        try {
            const res = await fetch(API)

            if (!res.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${res.status}`)
            }

            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                // console.log(result.data)
                setMotion(result.data.vinyl1)
                setMotion2(result.data.vinyl2)
            } else {
                setMotion([])
                setMotion2([])
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`首頁膠卷區塊取得失敗: ${error.message}`)
            console.log('Catch 區塊被觸發了！')
            setMotion([])
            setMotion2([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const sectionClass = async () => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/home/class`

        try {
            const res = await fetch(API)

            if (!res.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${res.status}`)
            }

            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                // console.log(result.data)
                setCategory(result.data.vinyls)
            } else {
                setCategory([])
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`首頁種類區塊取得失敗: ${error.message}`)
            setCategory([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const sectionSale = async (id = null) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/home/sale`

        if (id) {
            API += `?id=${id}`
        }
        try {
            const res = await fetch(API)

            if (!res.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${res.status}`)
            }

            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                // console.log(result.data)
                setSales(result.data.sale)
                setRecommend(result.data.recommend)
            } else {
                setSales([])
                setRecommend([])
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`首頁銷售與推薦區塊取得失敗: ${error.message}`)
            setSales([])
            setRecommend([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const sectionNews = async (type = null) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/home/news`

        if (type) {
            API += `?type=${type}`
        }

        try {
            const res = await fetch(API)

            if (!res.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${res.status}`)
            }

            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                // console.log(result.data)
                setNews(result.data)
            } else {
                setNews([])
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`首頁論壇取得失敗: ${error.message}`)
            setNews([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const sectionRank = async (id = null) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/home/rank`

        if (id) {
            API += `?id=${id}`
        }

        try {
            const res = await fetch(API)

            if (!res.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${res.status}`)
            }

            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                // console.log(result.data)
                setRank(result.data)
            } else {
                setRank([])

                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`首頁排行區塊區塊取得失敗: ${error.message}`)
            setRank([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const sectionShop = async (city = null) => {
        setIsLoading(true)
        let API = `http://localhost:3005/api/home/shop`

        if (city) {
            API += `?city=${city}`
        }

        // console.log(API)

        try {
            const res = await fetch(API)

            if (!res.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${res.status}`)
            }

            const result = await res.json()
            // console.log(result)

            if (result.status == 'success') {
                // console.log(result.data)
                setShop(result.data)
            } else {
                setShop([])
                throw new Error(result.message)
            }
        } catch (error) {
            console.log(`首頁商店取得失敗: ${error.message}`)
            setShop([])
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <HomeContext.Provider
            value={{
                motion,
                motion2,
                isLoading,
                sectionClass,
                category,
                motionFilm,
                sales,
                recommend,
                sectionSale,
                news,
                sectionNews,
                rank,
                sectionRank,
                shop,
                sectionShop,
            }}
        >
            {children}
        </HomeContext.Provider>
    )
}

export const useHome = () => useContext(HomeContext)
