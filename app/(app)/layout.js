import BarraLateral from "../BarraLateral";
import AlertProvider from "../AlertProvider";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AlertProvider>
      <div className="flex min-h-screen">
        <BarraLateral email={user?.email} />

        <main className="flex-1 min-w-0 bg-white text-gray-900 p-8 print:p-0">
          {children}
        </main>
      </div>
    </AlertProvider>
  );
}
