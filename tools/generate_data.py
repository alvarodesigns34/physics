"""Genera src/science/data/elements.ts e isotopes.json a partir de la base de datos de `mendeleev`.

Uso:  python -m venv tools/.venv && tools/.venv/bin/pip install mendeleev==1.3.0
      tools/.venv/bin/python tools/generate_data.py

Fuentes de mendeleev: pesos atómicos estándar (IUPAC/CIAAW), energías de ionización (NIST ASD),
afinidades electrónicas (recopilación de Rienstra-Kiracofe et al. y valores más recientes),
electronegatividad de Pauling (CRC), radios covalentes (Pyykkö y Atsumi, 2009),
radios cristalinos (Shannon, 1976) e isótopos (NUBASE / IUPAC).
"""
import json, os, re
from mendeleev import element

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'science', 'data')

NAMES = ["Hidrógeno","Helio","Litio","Berilio","Boro","Carbono","Nitrógeno","Oxígeno","Flúor","Neón",
"Sodio","Magnesio","Aluminio","Silicio","Fósforo","Azufre","Cloro","Argón","Potasio","Calcio",
"Escandio","Titanio","Vanadio","Cromo","Manganeso","Hierro","Cobalto","Níquel","Cobre","Zinc",
"Galio","Germanio","Arsénico","Selenio","Bromo","Kriptón","Rubidio","Estroncio","Itrio","Circonio",
"Niobio","Molibdeno","Tecnecio","Rutenio","Rodio","Paladio","Plata","Cadmio","Indio","Estaño",
"Antimonio","Telurio","Yodo","Xenón","Cesio","Bario","Lantano","Cerio","Praseodimio","Neodimio",
"Prometio","Samario","Europio","Gadolinio","Terbio","Disprosio","Holmio","Erbio","Tulio","Iterbio",
"Lutecio","Hafnio","Tantalio","Wolframio","Renio","Osmio","Iridio","Platino","Oro","Mercurio",
"Talio","Plomo","Bismuto","Polonio","Astato","Radón","Francio","Radio","Actinio","Torio",
"Protactinio","Uranio","Neptunio","Plutonio","Americio","Curio","Berkelio","Californio","Einstenio","Fermio",
"Mendelevio","Nobelio","Lawrencio","Rutherfordio","Dubnio","Seaborgio","Bohrio","Hasio","Meitnerio","Darmstatio",
"Roentgenio","Copernicio","Nihonio","Flerovio","Moscovio","Livermorio","Teneso","Oganesón"]
assert len(NAMES) == 118

SERIES = {
  'Alkali metals': 'alcalino', 'Alkaline earth metals': 'alcalinoterreo', 'Transition metals': 'transicion',
  'Lanthanides': 'lantanido', 'Actinides': 'actinido', 'Poor metals': 'otro-metal', 'Metalloids': 'semimetal',
  'Nonmetals': 'no-metal', 'Halogens': 'halogeno', 'Noble gases': 'gas-noble',
}
# Elementos sin peso atómico estándar (IUPAC/CIAAW): se muestra el número másico del isótopo más estable.
NO_STANDARD_WEIGHT = {43, 61, 84, 85, 86, 87, 88, 89} | set(range(93, 119))

UNIT_S = {'ysec':1e-24,'zsec':1e-21,'asec':1e-18,'psec':1e-12,'nsec':1e-9,'usec':1e-6,'msec':1e-3,'sec':1.0,
  'minute':60.0,'hour':3600.0,'day':86400.0,'year':3.15576e7}
for p, f in [('k',1e3),('M',1e6),('G',1e9),('T',1e12),('P',1e15),('E',1e18),('Z',1e21),('Y',1e24)]:
    UNIT_S[p+'year'] = 3.15576e7 * f

def norm_conf(econf: str) -> str:
    # "[Xe] 4f14 5d 6s2" -> "[Xe] 4f14 5d1 6s2"
    parts = econf.split()
    out = []
    for p in parts:
        if p.startswith('['):
            out.append(p)
            continue
        m = re.fullmatch(r'(\d)([spdf])(\d*)', p)
        assert m, (econf, p)
        out.append(f"{m.group(1)}{m.group(2)}{m.group(3) or '1'}")
    return ' '.join(out)

rows = []
isotopes = {}
for z in range(1, 119):
    e = element(z)
    if 57 <= z <= 70:
        group, row, col, block = None, 9, z - 57 + 3, 'f'
    elif 89 <= z <= 102:
        group, row, col, block = None, 10, z - 89 + 3, 'f'
    else:
        group = 3 if z in (71, 103) else e.group_id
        row, col = e.period, group
        block = 's' if group in (1, 2) or z == 2 else ('p' if group >= 13 else 'd')
    cat = SERIES[e.series]
    if z in (71, 103):
        cat = 'lantanido' if z == 71 else 'actinido'
    ea = e.electron_affinity
    if ea is not None and ea <= 0:
        ea = None  # anión no ligado: afinidad electrónica nula o negativa
    ionic = []
    for r in e.ionic_radii:
        if r.coordination == 'VI' and r.crystal_radius is not None:
            ionic.append([r.charge, round(r.crystal_radius, 1)])
    # una entrada por carga (la primera con NC = VI)
    seen = set(); ionic_u = []
    for c, rr in ionic:
        if c in seen: continue
        seen.add(c); ionic_u.append([c, rr])
    rows.append([
        z, e.symbol, NAMES[z-1], round(e.atomic_weight, 6), z not in NO_STANDARD_WEIGHT,
        e.period, group, block, cat, norm_conf(e.econf), z > 103,
        e.en_pauling, None if e.ionenergies.get(1) is None else round(e.ionenergies[1], 4),
        None if e.ionenergies.get(2) is None else round(e.ionenergies[2], 4),
        None if ea is None else round(ea, 4), e.covalent_radius_pyykko, row, col, ionic_u,
    ])
    L = []
    for i in e.isotopes:
        if i.is_radioactive:
            hl = None if i.half_life is None or i.half_life_unit is None else float('%.4g' % (i.half_life * UNIT_S[i.half_life_unit]))
        else:
            hl = -1
        L.append([i.mass_number, round(i.mass, 6) if i.mass else None, i.abundance or 0, hl])
    L.sort(key=lambda x: x[0])
    isotopes[str(z)] = L

header = '''// ARCHIVO GENERADO por tools/generate_data.py — no editar a mano.
// Campos: [Z, símbolo, nombre, masa atómica (u), ¿peso estándar IUPAC?, periodo, grupo|null, bloque, categoría,
//          configuración fundamental, ¿configuración predicha?, χ Pauling, EI1 (eV), EI2 (eV),
//          afinidad electrónica (eV, null si el anión no es estable), radio covalente (pm),
//          fila y columna de la tabla, radios cristalinos NC VI [carga, pm]]
export type RawElement = [number, string, string, number, boolean, number, number | null, 's' | 'p' | 'd' | 'f', string, string, boolean,
  number | null, number | null, number | null, number | null, number | null, number, number, [number, number][]];
'''
with open(os.path.join(OUT, 'elements.raw.ts'), 'w', encoding='utf-8') as f:
    f.write(header)
    f.write('export const RAW_ELEMENTS: RawElement[] = [\n')
    for r in rows:
        f.write('  ' + json.dumps(r, ensure_ascii=False).replace('true', 'true').replace('null', 'null') + ',\n')
    f.write('];\n')
with open(os.path.join(OUT, 'isotopes.json'), 'w') as f:
    json.dump(isotopes, f, separators=(',', ':'))
print('ok', len(rows), sum(len(v) for v in isotopes.values()))
