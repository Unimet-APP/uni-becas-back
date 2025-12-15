# Cambiar headers de plazas
s/const headers = \['Nombre', 'Capacidad', 'Ocupadas', 'Disponibles'\];/const headers = ['Nombre', 'Tipo', 'Estado', 'Ocupación %', 'Supervisor'];/

# Cambiar rows de plazas - línea por línea
/const rows = plazas\.map\(p => \[/{
N
N
N
N
s/const rows = plazas\.map(p => \[\n      p\.nombre\.substring(0, 50),\n      p\.capacidad,\n      p\.ocupadas,\n      p\.disponibles\n    \]);/const rows = plazas.map(p => [\n      p.nombre.substring(0, 35),\n      p.tipoAyudantia || 'N\/A',\n      p.estado,\n      \`\${p.porcentajeOcupacion}%\`,\n      p.supervisorResponsable ? \`\${p.supervisorResponsable.nombre} \${p.supervisorResponsable.apellido}\` : 'Sin asignar'\n    ]);/
}

# Cambiar columnWidths de plazas
s/const columnWidths = \[280, 80, 80, 90\];/const columnWidths = [140, 90, 70, 80, 150];/
