"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { se } from "date-fns/locale"

interface Props {
  open: boolean
  onClose: () => void
  customer: any
  onSuccess: () => void
}

export default function CustomerDetailModal({ open, onClose, customer, onSuccess,  }: Props) {
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState<any>(customer)
  const [errors, setErrors] = useState<any>({})
  const { toast } = useToast()

  useEffect(() => {
    setForm(customer)
    setIsEdit(false)
    setErrors({})
  }, [customer])

   if (!customer) return null

   const handleSave = async () => {
    try {
     const token = localStorage.getItem("token")

      const res = await fetch(`http://127.0.0.1:8000/api/customers/${customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          Authorization: `Bearer ${token}`, // 🔥 WAJIB
        },
        body: JSON.stringify(form),
      })
      const text = await res.text()
      console.log("RESPONSE:", text)

      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {}

      if (!res.ok) {
        setErrors(data.errors || {})

        let firstError = "Terjadi kesalahan"

        if (data?.errors) {
          const errorsArr = Object.values(data.errors) as string[][]
          firstError = errorsArr[0][0]

          // 🔥 custom biar lebih user-friendly
          if (data.errors.phone) {
            firstError = "Nomor telepon sudah terdaftar"
          }
        } else if (data?.message) {
          firstError = data.message
        }

        toast({
        title: "Gagal",
        description: firstError,
        variant: "destructive",
      })
        return
      }

      toast({
      title: "Berhasil",
      description: "Data berhasil diupdate",
    })

      setErrors({})
      onSuccess()
      setIsEdit(false)
      onClose()

    } catch (err) {
      console.error(err)

      toast({
      title: "Error",
      description: "Terjadi kesalahan koneksi",
      variant: "destructive",
    })
    }
  }


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Detail Pelanggan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <Field
            label="Nama"
            value={form?.name}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, name: val })}
          />

          <Field
            label="No Telepon"
            value={form?.phone}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, phone: val })}
            error={errors?.phone?.[0]}
          />

          <Field
            label="Email"
            value={form?.email}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, email: val })}
          />

          <Field
            label="Alamat"
            value={form?.address}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, address: val })}
          />

          <div className="flex justify-end pt-4">

            {!isEdit ? (
              <Button onClick={() => setIsEdit(true)}>
                Edit
              </Button>
            ) : (
              <>
                <Button onClick={handleSave}>
                  Simpan
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setForm(customer)
                    setIsEdit(false)
                  }}
                >
                  Batal
                </Button>
              </>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, isEdit, onChange, error, }: { label: string; value: any; isEdit: boolean; onChange: (value: string) => void; error?: string }) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>

      {isEdit ? (
        <>
        <input
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          className={`border rounded-md p-2 w-full ${
              error ? "border-red-500" : ""
            }`}
        />
        
      {error && (
            <p className="text-red-500 text-sm mt-1">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="border rounded-md p-2 bg-gray-50">
          {value || "-"}
        </div>
      )}
    </div>
  )
}