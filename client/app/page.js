'use client'

// import Image from 'next/image'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useHome } from '@/hooks/use-home'
import { useProducts } from '@/hooks/use-product'
import { usePathname } from 'next/navigation'

import Head from './_components/head/head'
import Broadcast from './_components/broadcast'
import Class from './_components/class'
import Sale from './_components/sale/sale'
import News from './_components/news'
import Rank from './_components/rank/rank'
import Map from './_components/map/map'
import { redirect } from 'next/navigation'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export default function HomePage() {
    const [type, setType] = useState('')
    const [city, setCity] = useState('')
    const [refresh, setRefresh] = useState(false)

    const { user } = useAuth()
    const { bookmark } = useProducts()
    const pathname = usePathname()

    let userId = user?.id || null
    console.log(userId)

    const {
        motion,
        motion2,
        motionFilm,
        sectionClass,
        category,
        sales,
        recommend,
        sectionSale,
        news,
        sectionNews,
        rank,
        sectionRank,
        shop,
        sectionShop,
    } = useHome()

    useEffect(() => {
        motionFilm()
        sectionRank(userId)
        sectionClass()
        sectionSale(userId)
    }, [])

    useEffect(() => {
        if (pathname === '/') {
            sectionRank(userId)
            sectionSale(userId)
        }
    }, [pathname, userId])

    useEffect(() => {
        sectionNews(type)
    }, [refresh])

    useEffect(() => {
        sectionShop(city)
    }, [refresh])

    function getNewsType(e) {
        setType(e)
        setRefresh(!refresh)
    }

    function getBookmark(id) {
        if (!userId) {
            // alert('請登入')
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
            // redirect('/auth/login')
            return
        }

        bookmark(id, userId)
    }

    function getShopCity(e) {
        setCity(e)
        setRefresh(!refresh)
    }

    return (
        <>
            <Head motion={motion} motion2={motion2} />

            <Broadcast />

            <Class category={category} />

            <Sale
                sales={sales}
                recommend={recommend}
                getBookmark={getBookmark}
            />

            <News news={news} getNewsType={getNewsType} type={type} />

            <Rank rank={rank} getBookmark={getBookmark} />

            <Map shop={shop} getCity={getShopCity} />
        </>
    )
}
