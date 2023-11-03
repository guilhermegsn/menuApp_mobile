import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../Services/FirebaseConfig';


export default function Teste() {

  interface Data {
    phone?: string; 
  }

  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<Data>({})

  // useEffect(() => {
  //   setIsLoading(true)
  //   const getData = async () => {
  //     try {
  //       const docRef = doc(db, "Establishment", "C1sOox4WzFxuDJ1fkxK5");
  //       const docSnap = await getDoc(docRef)
  //       if(docSnap.exists()){
  //         setData(docSnap.data())
  //         console.log(docSnap.data())
  //       }
  //     } catch (error) {
  //       console.log(error)
  //     }finally{setIsLoading(false)}
  //   }
  //   getData()
  // }, [])


  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: "red" }}>{data.phone}</Text>
    </View>
  )
}
