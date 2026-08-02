"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Props {
  open: boolean
  onClose: () => void
  karyawan: any
  onSuccess: () => void
}

export default function KaryawanDetailModal({ open, onClose, karyawan, onSuccess }: Props) {
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState<any>(karyawan)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    setForm(karyawan)
    setIsEdit(false)
    setErrors({})
  }, [karyawan])

  if (!karyawan) return null

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token")

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/karyawan/${karyawan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          Authorization: `Bearer ${token}`,
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

          if (data.errors.email) {
            firstError = "Email ini sudah digunakan oleh karyawan lain"
          }
        } else if (data?.message) {
          firstError = data.message
        }

        toast.error(firstError)
        return
      }

      toast.success("Data karyawan berhasil diupdate") 

      setErrors({})
      onSuccess()
      setIsEdit(false)
      onClose()

    } catch (err) {
      console.error(err)
      toast.error("Terjadi kesalahan koneksi") // 👈 4. Ganti toast error jadi toast.error Sonner
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Detail Karyawan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <Field
            label="Nama"
            value={form?.name}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, name: val })}
            error={errors?.name?.[0]}
          />

          <Field
            label="Email"
            value={form?.email}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, email: val })}
            error={errors?.email?.[0]}
          />

          <Field
            label="Role / Peran"
            value={form?.role}
            isEdit={isEdit}
            onChange={(val) => setForm({ ...form, role: val })}
            error={errors?.role?.[0]}
            options={[
              { label: "Operator", value: "operator" },
              { label: "Desainer", value: "desainer" },
              { label: "Kurir", value: "kurir" }
            ]}
          />

          <div>
            <label className="text-sm text-gray-500">Tanggal Bergabung</label>
            <div className="border rounded-md p-2 bg-gray-50 text-gray-600">
              {karyawan?.created_at ? new Date(karyawan.created_at.replace(" ", "T")).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
              }) : "-"}
            </div>
          </div>

          <div className="flex justify-end pt-4 gap-2">
            {!isEdit ? (
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setIsEdit(true)}>
                Edit Data
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                  setForm(karyawan)
                  setIsEdit(false)
                  setErrors({})
                }}>
                  Batal
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave}>
                  Simpan Perubahan
                </Button>
              </>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ 
  label, 
  value, 
  isEdit, 
  onChange, 
  error,
  options 
}: { 
  label: string; 
  value: any; 
  isEdit: boolean; 
  onChange: (value: string) => void; 
  error?: string;
  options?: { label: string, value: string }[] 
}) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>

      {isEdit ? (
        <>
          {options ? (
            <select
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                error ? "border-red-500 focus-visible:ring-red-500" : "border-input"
              }`}
            >
              <option value="" disabled>Pilih {label}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                error ? "border-red-500 focus-visible:ring-red-500" : "border-input"
              }`}
            />
          )}
          
          {error && (
            <p className="text-red-500 text-sm mt-1">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="border rounded-md p-2 bg-gray-50 capitalize flex h-10 items-center text-sm">
          {value || "-"}
        </div>
      )}
    </div>
  )
}