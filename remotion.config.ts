import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";

// staticFile() lê de media/, não de public/: áudio, vídeo e avatar dos filmes
// ficam fora do build do site (cada deploy no Vercel copiava tudo).
Config.setPublicDir("./media");

Config.overrideWebpackConfig((currentConfiguration) => {
    return enableTailwind(currentConfiguration);
});
