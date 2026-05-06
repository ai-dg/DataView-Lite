/**
 * Heuristic humanizer: turns snake_case / abbreviated SQLite names
 * into readable French labels. No LLM call here.
 */
export class Humanizer {
  readonly #dictionary: Map<string, string>;

  constructor(extraDictionary: Record<string, string> = {}) {
    this.#dictionary = new Map(
      Object.entries({ ...DEFAULT_FR_DICTIONARY, ...extraDictionary }),
    );
  }

  humanizeTable(rawName: string): string {
    return this.#humanize(rawName);
  }

  humanizeColumn(rawName: string): string {
    return this.#humanize(rawName);
  }

  #humanize(rawName: string): string {
    const stripped = this.#strip(rawName);
    const words = stripped.split(/[_\s]+/).filter(Boolean);
    if (words.length === 0) return this.#capitalize(rawName);

    const translated = words
      .map((w) => {
        const hit = this.#dictionary.get(w.toLowerCase());
        // Dictionary author picked the casing (e.g. "VIN", "ISBN", "(€)") —
        // keep it as-is. Raw, untranslated words go to lowercase.
        if (hit !== undefined) return hit;
        return w.toLowerCase();
      })
      .filter((w) => w.length > 0);

    if (translated.length === 0) return this.#capitalize(rawName);
    const joined = translated.join(' ');
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  #strip(name: string): string {
    return name
      .replace(/^(tbl_|t_|tmp_|bk_|x_)/i, '')
      .replace(/_(v\d+|old|x\d+|\d{4})$/i, '');
  }

  #capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
}

const DEFAULT_FR_DICTIONARY: Record<string, string> = {
  // Tables
  ord: 'commandes',
  orders: 'commandes',
  order: 'commandes',
  inv: 'factures',
  invoice: 'factures',
  invoices: 'factures',
  prod: 'produits',
  product: 'produits',
  products: 'produits',
  cust: 'clients',
  customer: 'clients',
  customers: 'clients',
  client: 'clients',
  clients: 'clients',
  usr: 'utilisateurs',
  user: 'utilisateurs',
  users: 'utilisateurs',
  membre: 'membres',
  member: 'membres',
  members: 'membres',
  cotis: 'cotisations',
  evt: 'événements',
  event: 'événements',
  events: 'événements',

  // Columns
  id: 'identifiant',
  fk: 'lien',
  qty: 'quantité',
  quantity: 'quantité',
  amt: 'montant',
  amount: 'montant',
  total: 'total',
  price: 'prix',
  prix: 'prix',
  email: 'e-mail',
  mail: 'e-mail',
  phone: 'téléphone',
  tel: 'téléphone',
  addr: 'adresse',
  address: 'adresse',
  city: 'ville',
  ville: 'ville',
  zip: 'code postal',
  country: 'pays',
  name: 'nom',
  nom: 'nom',
  prenom: 'prénom',
  firstname: 'prénom',
  lastname: 'nom',
  status: 'statut',
  statut: 'statut',
  date: 'date',
  created: 'créé',
  updated: 'mis à jour',
  joined: 'inscrit',
  payment: 'paiement',
  payments: 'paiements',
  due: 'échéance',
  number: 'numéro',
  title: 'titre',
  location: 'lieu',
  attendees: 'participants',
  active: 'actif',
  year: 'année',
  at: 'le',
  on: 'le',
  full: '',
  count: '',
  dob: 'date de naissance',
  paid: 'payé',
  paye: 'payé',
  ref: 'référence',
  reference: 'référence',
  label: 'libellé',
  libelle: 'libellé',
  stock: 'stock',
  description: 'description',
  is: '',

  // Common cross-domain abbreviations (kept conservative on purpose so the
  // weird_*.db files still demonstrate the heuristic limits).
  nm: 'nom',
  fst: 'prénom',
  lst: 'nom',
  eml: 'e-mail',
  loc: 'lieu',
  cty: 'ville',
  crt: 'créé',
  ts: 'horodatage',
  tot: 'total',
  st: 'statut',
  sts: 'statut',
  flag: 'indicateur',
  link: 'lien',
  pd: 'payé',
  hrd: 'embauché',
  slr: 'salaire',
  mo: 'mensuel',
  mgr: 'manager',
  dpt: 'département',
  cd: 'code',
  lv: 'congé',
  typ: 'type',
  dys: 'jours',
  gross: 'brut',
  net: 'net',
  tx: 'taxe',
  pr: 'paie',
  log: 'journal',

  // Library
  isbn: 'ISBN',
  pub: 'publication',
  bk: 'livre',
  bks: 'livres',
  book: 'livre',
  books: 'livres',
  loan: 'prêt',
  loans: 'prêts',
  loaned: 'prêté',
  returned: 'rendu',
  avail: 'disponible',
  author: 'auteur',

  // Vehicles / garage
  vehicle: 'véhicule',
  vehicles: 'véhicules',
  plate: 'plaque',
  no: 'n°',
  make: 'marque',
  model: 'modèle',
  vin: 'VIN',
  mileage: 'kilométrage',
  km: 'km',
  service: 'entretien',
  next: 'prochain',
  repair: 'réparation',
  repairs: 'réparations',
  labor: 'main-d’œuvre',
  hours: 'heures',
  cost: 'coût',
  eur: '(€)',

  // Medical
  pat: 'patient',
  patient: 'patient',
  patients: 'patients',
  apt: 'rendez-vous',
  appointment: 'rendez-vous',
  appointments: 'rendez-vous',
  prescription: 'ordonnance',
  prescriptions: 'ordonnances',
  rx: 'ordonnance',
  med: 'médicament',
  meds: 'médicaments',
  dosage: 'dosage',
  mg: 'mg',
  duration: 'durée',
  dur: 'durée',
  min: 'min',
  days: 'jours',
  reason: 'motif',
  done: 'effectué',
  issued: 'émis',
};
