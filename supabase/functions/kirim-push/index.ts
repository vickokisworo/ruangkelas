import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY =
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BG3sVw-J1mXf-GbWtZmEfuhdV_Ybla55o5dghHjEGgbi56rG43B-kau1p5k6cYfx5ebOcQAEuqy03B-A4FDKb-A'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@ruangkelas.com'

if (VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    // Supabase Webhook payload format:
    // { type: 'INSERT', table: 'notifikasi', record: { user_id, judul, isi, tautan } }
    const record = payload.record || payload

    const { user_id, judul, isi, tautan } = record
    if (!user_id || !judul) {
      return new Response(JSON.stringify({ error: 'Payload tidak valid' }), { status: 400 })
    }

    if (!VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY belum dikonfigurasi di Secret' }), { status: 500 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ambil daftar langganan HP aktif untuk user penerima notifikasi
    const { data: subs, error: errSub } = await supabase
      .from('push_langganan')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id)

    if (errSub || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: 'Tidak ada langganan push aktif untuk user ini' }), { status: 200 })
    }

    const bodyNotif = JSON.stringify({
      title: judul,
      body: isi || 'Ada pengingat baru.',
      url: tautan || '/dashboard',
    })

    const hasil = await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, bodyNotif)
        } catch (err: any) {
          // Jika token sudah tidak berlaku (410 Gone / 404 Not Found), hapus dari database
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_langganan').delete().eq('id', sub.id)
          }
          throw err
        }
      }),
    )

    return new Response(
      JSON.stringify({ success: true, total: hasil.length }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
