import { useEffect } from "react";
import { Layout } from "../Components/Sider";

export function Home() {
  useEffect(() => {
    document.title = "Home - Painel Docker";
    // lang da página
    document.documentElement.lang = "pt-BR";

  }, []);
  return (<>

    {/* <Navigation /> */}
    {/* <Header /> */}
    <Layout />
  </>
  );
}
