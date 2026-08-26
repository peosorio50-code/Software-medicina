#!/usr/bin/env bash
# Confere se o rascunho visual (docs/index.html) e o app real (frontend/) têm as
# mesmas telas. Existir só de um lado é defeito: quem acompanha o projeto enxerga
# apenas o rascunho publicado e concluiria, errado, que o produto já faz aquilo.
#
# Uso: ./scripts/check-paridade.sh
set -uo pipefail
cd "$(dirname "$0")/.."

# Telas cujo nome difere entre os dois lados, e equivalências que não são rotas.
declare -A APELIDO=( ["dashboard"]="inicio" )
# Telas do app real sem aba própria no rascunho (existem lá de outra forma).
FORA_DO_MENU=" login registrar agendar "

mockup=$(grep -oE 'id="view-[a-z]+"' docs/index.html | sed 's/id="view-//; s/"//' | sort -u)
rotas=$(grep -oE '<Route path="/[a-z]+' frontend/src/App.tsx | sed 's|<Route path="/||' | sort -u)

app=""
for r in $rotas; do
  [[ "$FORA_DO_MENU" == *" $r "* ]] && continue
  app+="${APELIDO[$r]:-$r}"$'\n'
done
app=$(printf '%s' "$app" | sort -u)

so_no_mockup=$(comm -23 <(printf '%s\n' $mockup) <(printf '%s\n' $app))
so_no_app=$(comm -13 <(printf '%s\n' $mockup) <(printf '%s\n' $app))

falhou=0
if [ -n "$so_no_mockup" ]; then
  echo "FALTA NO APP REAL (existe só no rascunho visual):"
  printf '  - %s\n' $so_no_mockup
  falhou=1
fi
if [ -n "$so_no_app" ]; then
  echo "FALTA NO RASCUNHO VISUAL (existe só no app real):"
  printf '  - %s\n' $so_no_app
  falhou=1
fi

# Toda rota de IA do backend precisa ser chamada por alguma tela do frontend —
# senão a funcionalidade existe no servidor e é inalcançável para o médico.
orfas=""
for rota in $(grep -oE 'aiRouter\.(get|post)\("([^"]*)"' backend/src/routes/ai.ts | grep -oE '"/[^"]*"' | tr -d '"'); do
  base=$(printf '%s' "$rota" | sed -E 's#/:[a-zA-Z]+#/#g; s#//#/#g' | cut -d/ -f2)
  grep -rqE "/ai/[a-z-]*${base}" frontend/src || orfas+="  - /ai$rota"$'\n'
done
if [ -n "$orfas" ]; then
  echo "ROTAS DE IA SEM TELA NO FRONTEND:"
  printf '%s' "$orfas"
  falhou=1
fi

if [ "$falhou" -eq 0 ]; then
  echo "Paridade OK: rascunho visual e app real têm as mesmas telas."
fi
exit $falhou
