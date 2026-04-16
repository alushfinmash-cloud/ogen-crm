import Sidebar from '@/components/Sidebar'
import ContactList from '@/components/ContactList'

export default function ContactsPage() {
  return (
    <div className="flex h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ContactList />
      </main>
    </div>
  )
}
