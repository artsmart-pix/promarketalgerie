/**
 * 13 main categories with subcategories and filter fields
 * Based on the ProMarket Algérie specification (Section 2)
 */
const CATEGORIES = [
  {
    id: 1, slug: 'industrie-usines',
    name_fr: 'Industrie & Usines', name_ar: 'الصناعة والمصانع',
    icon: 'fa-industry',
    subcategories: [
      { slug: 'machines-cnc',       name_fr: 'Machines CNC',                 name_ar: 'آلات CNC' },
      { slug: 'conditionnement',    name_fr: 'Lignes de conditionnement',     name_ar: 'خطوط التعبئة' },
      { slug: 'presses-injection',  name_fr: 'Presses à injecter',           name_ar: 'مكابس الحقن' },
      { slug: 'chaudronnerie',      name_fr: 'Chaudronnerie',                name_ar: 'الحدادة الصناعية' },
      { slug: 'transformateurs',    name_fr: 'Transformateurs',              name_ar: 'المحولات' },
    ],
    filters: [
      { key: 'puissance_kw',   label_fr: 'Puissance (kW)',          label_ar: 'القدرة (كيلوواط)',   type: 'number' },
      { key: 'cadence',        label_fr: 'Cadence de production',   label_ar: 'معدل الإنتاج',       type: 'number' },
      { key: 'marque',         label_fr: 'Marque',                  label_ar: 'العلامة التجارية',   type: 'text'   },
      { key: 'annee',          label_fr: 'Année de fabrication',    label_ar: 'سنة الصنع',          type: 'number' },
      { key: 'heures',         label_fr: 'Heures d\'utilisation',   label_ar: 'ساعات الاستخدام',    type: 'number' },
      { key: 'etat',           label_fr: 'État général',            label_ar: 'الحالة العامة',       type: 'select',
        options: ['Neuf','Très bon','Bon','Correct','Pour pièces'] },
    ],
  },
  {
    id: 2, slug: 'restauration-hotellerie',
    name_fr: 'Restauration & Hôtellerie', name_ar: 'الإطعام والضيافة',
    icon: 'fa-utensils',
    subcategories: [
      { slug: 'cuisines-inox',      name_fr: 'Cuisines professionnelles en inox', name_ar: 'مطابخ مهنية' },
      { slug: 'fours-pro',          name_fr: 'Fours professionnels',              name_ar: 'أفران مهنية' },
      { slug: 'cafes-industriels',  name_fr: 'Machines à café industrielles',     name_ar: 'ماكينات قهوة صناعية' },
      { slug: 'chambres-froides',   name_fr: 'Chambres froides',                  name_ar: 'غرف التبريد' },
    ],
    filters: [
      { key: 'alimentation',   label_fr: 'Alimentation',         label_ar: 'نوع التغذية',        type: 'select',
        options: ['Électrique','Gaz','Mixte'] },
      { key: 'capacite',       label_fr: 'Capacité (Litres/Couverts)', label_ar: 'السعة',        type: 'number' },
      { key: 'conformite',     label_fr: 'Conformité hygiène',  label_ar: 'مطابقة معايير النظافة', type: 'boolean' },
      { key: 'etat',           label_fr: 'État',                label_ar: 'الحالة',              type: 'select',
        options: ['Neuf','Très bon','Bon','Correct','Pour pièces'] },
      { key: 'marque',         label_fr: 'Marque',              label_ar: 'العلامة التجارية',   type: 'text' },
    ],
  },
  {
    id: 3, slug: 'commerce-services',
    name_fr: 'Commerce & Services', name_ar: 'التجارة والخدمات',
    icon: 'fa-store',
    subcategories: [
      { slug: 'rayonnages',    name_fr: 'Rayonnages & étagères',   name_ar: 'رفوف ومكتبات' },
      { slug: 'comptoirs',     name_fr: 'Comptoirs & vitrines',    name_ar: 'كاونترات وواجهات عرض' },
      { slug: 'caisses',       name_fr: 'Caisses tactiles',        name_ar: 'كاشيرات لمسية' },
      { slug: 'balayeuses',    name_fr: 'Balayeuses de voirie',    name_ar: 'كانسات الشوارع' },
      { slug: 'aspirateurs',   name_fr: 'Aspirateurs industriels', name_ar: 'مكانس صناعية' },
    ],
    filters: [
      { key: 'dimensions',     label_fr: 'Dimensions (H×L×P cm)', label_ar: 'الأبعاد (H×W×D)',  type: 'text'   },
      { key: 'charge_max',     label_fr: 'Capacité de charge (kg)', label_ar: 'الحمولة القصوى', type: 'number' },
      { key: 'motorisation',   label_fr: 'Type de motorisation',  label_ar: 'نوع المحرك',       type: 'select',
        options: ['Électrique','Thermique','Manuel','Batterie'] },
      { key: 'marque',         label_fr: 'Marque',                label_ar: 'العلامة التجارية', type: 'text' },
    ],
  },
  {
    id: 4, slug: 'sante-medical',
    name_fr: 'Santé & Médical', name_ar: 'الصحة والطب',
    icon: 'fa-heartbeat',
    subcategories: [
      { slug: 'imagerie',       name_fr: 'Imagerie médicale (IRM, Écho)', name_ar: 'التصوير الطبي' },
      { slug: 'dentaire',       name_fr: 'Fauteuils et équipements dentaires', name_ar: 'معدات طب الأسنان' },
      { slug: 'automates-labo', name_fr: 'Automates de laboratoire',      name_ar: 'آلات المختبر' },
      { slug: 'materiel-bloc',  name_fr: 'Matériel de bloc opératoire',   name_ar: 'معدات غرف العمليات' },
    ],
    filters: [
      { key: 'certification',  label_fr: 'Certification (CE, ISO…)', label_ar: 'الشهادات',     type: 'text' },
      { key: 'version_logiciel', label_fr: 'Version logiciel',       label_ar: 'إصدار البرنامج', type: 'text' },
      { key: 'derniere_maintenance', label_fr: 'Date dernière maintenance', label_ar: 'تاريخ آخر صيانة', type: 'date' },
      { key: 'etat',           label_fr: 'État',                    label_ar: 'الحالة',         type: 'select',
        options: ['Neuf','Très bon','Bon','Correct'] },
    ],
  },
  {
    id: 5, slug: 'agriculture-peche',
    name_fr: 'Agriculture & Pêche', name_ar: 'الزراعة والصيد',
    icon: 'fa-tractor',
    subcategories: [
      { slug: 'tracteurs',     name_fr: 'Tracteurs',                name_ar: 'جرارات' },
      { slug: 'moissonneuses', name_fr: 'Moissonneuses-batteuses',  name_ar: 'حصادات' },
      { slug: 'irrigation',    name_fr: 'Pivots & systèmes d\'irrigation', name_ar: 'أنظمة الري' },
      { slug: 'bateaux-peche', name_fr: 'Bateaux de pêche',         name_ar: 'قوارب الصيد' },
      { slug: 'filets-pro',    name_fr: 'Filets & équipements de pêche', name_ar: 'شباك الصيد' },
    ],
    filters: [
      { key: 'puissance_cv',   label_fr: 'Puissance (CV)',          label_ar: 'القدرة (حصان)',   type: 'number' },
      { key: 'heures_moteur',  label_fr: 'Heures moteur/batteur',   label_ar: 'ساعات المحرك',   type: 'number' },
      { key: 'transmission',   label_fr: 'Transmission',            label_ar: 'ناقل الحركة',    type: 'select',
        options: ['4WD','2WD','Mécanique','Hydrostatique'] },
      { key: 'longueur_coque', label_fr: 'Longueur coque (m)',      label_ar: 'طول الهيكل (م)', type: 'number' },
      { key: 'marque',         label_fr: 'Marque',                  label_ar: 'العلامة التجارية', type: 'text' },
      { key: 'annee',          label_fr: 'Année',                   label_ar: 'السنة',           type: 'number' },
    ],
  },
  {
    id: 6, slug: 'construction-btp',
    name_fr: 'Construction & BTP', name_ar: 'البناء والأشغال العامة',
    icon: 'fa-hard-hat',
    subcategories: [
      { slug: 'pelles',          name_fr: 'Pelles hydrauliques',       name_ar: 'حفارات هيدروليكية' },
      { slug: 'chargeuses',      name_fr: 'Chargeuses & bulldozers',   name_ar: 'لوادر وجرافات' },
      { slug: 'grues',           name_fr: 'Grues & nacelles',          name_ar: 'رافعات' },
      { slug: 'centrales-beton', name_fr: 'Centrales à béton',        name_ar: 'محطات الخرسانة' },
      { slug: 'concasseurs',     name_fr: 'Concasseurs & cribles',     name_ar: 'كسارات ومناخل' },
      { slug: 'pieces-usure',    name_fr: 'Pièces d\'usure',           name_ar: 'قطع التآكل' },
    ],
    filters: [
      { key: 'poids_tonnes',    label_fr: 'Poids (tonnes)',           label_ar: 'الوزن (طن)',         type: 'number' },
      { key: 'heures_service',  label_fr: 'Heures de service',        label_ar: 'ساعات العمل',        type: 'number' },
      { key: 'capacite_godet',  label_fr: 'Capacité godet (m³)',      label_ar: 'سعة الحفار (م³)',    type: 'number' },
      { key: 'profondeur',      label_fr: 'Profondeur de cavage (m)', label_ar: 'عمق الحفر (م)',       type: 'number' },
      { key: 'marque',          label_fr: 'Marque',                   label_ar: 'العلامة التجارية',   type: 'text'   },
      { key: 'annee',           label_fr: 'Année',                    label_ar: 'السنة',               type: 'number' },
    ],
  },
  {
    id: 7, slug: 'transport-logistique',
    name_fr: 'Transport & Logistique', name_ar: 'النقل والخدمات اللوجستية',
    icon: 'fa-truck',
    subcategories: [
      { slug: 'camions-bennes',      name_fr: 'Camions bennes',          name_ar: 'شاحنات بصندوق قلاب' },
      { slug: 'tracteurs-routiers',  name_fr: 'Tracteurs routiers',      name_ar: 'جرارات طرقية' },
      { slug: 'semi-remorques',      name_fr: 'Semi-remorques',          name_ar: 'مقطورات نصفية' },
      { slug: 'chariots-elevateurs', name_fr: 'Chariots élévateurs',     name_ar: 'رافعات شوكية' },
      { slug: 'utilitaires',         name_fr: 'Véhicules utilitaires',   name_ar: 'مركبات خدمية' },
    ],
    filters: [
      { key: 'kilometrage',    label_fr: 'Kilométrage (km)',         label_ar: 'المسافة المقطوعة (كم)', type: 'number' },
      { key: 'capacite_levage', label_fr: 'Capacité de levage (kg)', label_ar: 'قدرة الرفع (كغ)',   type: 'number' },
      { key: 'hauteur_mat',    label_fr: 'Hauteur de mât (m)',       label_ar: 'ارتفاع الساري (م)',  type: 'number' },
      { key: 'energie',        label_fr: 'Énergie',                  label_ar: 'نوع الطاقة',         type: 'select',
        options: ['Diesel','Gaz','Électrique','LPG','Essence'] },
      { key: 'marque',         label_fr: 'Marque',                   label_ar: 'العلامة التجارية',   type: 'text' },
      { key: 'annee',          label_fr: 'Année',                    label_ar: 'السنة',               type: 'number' },
    ],
  },
  {
    id: 8, slug: 'informatique-electronique',
    name_fr: 'Informatique & Électronique', name_ar: 'الإعلام الآلي والإلكترونيات',
    icon: 'fa-server',
    subcategories: [
      { slug: 'serveurs',          name_fr: 'Serveurs & équipements réseau', name_ar: 'خوادم ومعدات شبكية' },
      { slug: 'parcs-pc',          name_fr: 'Parcs PC professionnels',       name_ar: 'أسطول حواسيب مهنية' },
      { slug: 'onduleurs',         name_fr: 'Onduleurs & groupes électrogènes', name_ar: 'مولدات الطاقة' },
      { slug: 'panneaux-solaires', name_fr: 'Panneaux solaires',             name_ar: 'ألواح شمسية' },
    ],
    filters: [
      { key: 'puissance_kva',  label_fr: 'Puissance (kVA)',     label_ar: 'القدرة (كيلوفولت أمبير)', type: 'number' },
      { key: 'stockage',       label_fr: 'Stockage (Go/To)',    label_ar: 'التخزين',                  type: 'text'   },
      { key: 'processeur',     label_fr: 'Processeur',          label_ar: 'المعالج',                  type: 'text'   },
      { key: 'etat_batterie',  label_fr: 'État de batterie',    label_ar: 'حالة البطارية',            type: 'select',
        options: ['Neuve','Bonne','Usée','À remplacer'] },
      { key: 'marque',         label_fr: 'Marque',              label_ar: 'العلامة التجارية',         type: 'text' },
    ],
  },
  {
    id: 9, slug: 'evenementiel-loisirs',
    name_fr: 'Évènementiel & Loisirs', name_ar: 'الفعاليات والترفيه',
    icon: 'fa-music',
    subcategories: [
      { slug: 'chapiteaux',    name_fr: 'Chapiteaux & tentes',      name_ar: 'خيام وأجنحة' },
      { slug: 'scenes',        name_fr: 'Scènes & podiums',         name_ar: 'مسارح ومنصات' },
      { slug: 'ecrans-led',    name_fr: 'Écrans LED extérieurs',     name_ar: 'شاشات LED خارجية' },
      { slug: 'sonorisation',  name_fr: 'Sonorisation professionnelle', name_ar: 'تجهيزات الصوت' },
      { slug: 'fitness-pro',   name_fr: 'Équipements fitness pro',   name_ar: 'معدات اللياقة المهنية' },
    ],
    filters: [
      { key: 'superficie',     label_fr: 'Superficie (m²)',       label_ar: 'المساحة (م²)',       type: 'number' },
      { key: 'pitch_led',      label_fr: 'Pitch LED (mm)',        label_ar: 'دقة LED (مم)',       type: 'number' },
      { key: 'puissance_w',    label_fr: 'Puissance sonore (W)',  label_ar: 'قدرة الصوت (واط)', type: 'number' },
      { key: 'resistance',     label_fr: 'Résistance (IP)',       label_ar: 'درجة الحماية',      type: 'text'   },
    ],
  },
  {
    id: 10, slug: 'divers-fonds-commerce',
    name_fr: 'Divers Pro & Fonds de Commerce', name_ar: 'متنوع ومحلات تجارية',
    icon: 'fa-building',
    subcategories: [
      { slug: 'usines-cle-en-main', name_fr: 'Usines clefs en main',    name_ar: 'مصانع جاهزة' },
      { slug: 'locaux-commerciaux', name_fr: 'Locaux commerciaux',      name_ar: 'محلات تجارية' },
      { slug: 'imprimerie',         name_fr: 'Imprimerie offset',        name_ar: 'مطابع أوفست' },
      { slug: 'salons-coiffure',    name_fr: 'Salons de coiffure',       name_ar: 'صالونات حلاقة' },
      { slug: 'autres-fonds',       name_fr: 'Autres fonds de commerce', name_ar: 'محلات تجارية أخرى' },
    ],
    filters: [
      { key: 'activite',       label_fr: 'Type d\'activité',     label_ar: 'نوع النشاط',    type: 'text'   },
      { key: 'wilaya',         label_fr: 'Wilaya',               label_ar: 'الولاية',        type: 'text'   },
      { key: 'superficie',     label_fr: 'Superficie (m²)',      label_ar: 'المساحة (م²)',  type: 'number' },
      { key: 'loyer_estime',   label_fr: 'Loyer estimé (DZD/m)', label_ar: 'الإيجار المقدر', type: 'number' },
      { key: 'registre_commerce', label_fr: 'Registre de commerce', label_ar: 'السجل التجاري', type: 'boolean' },
    ],
  },
  {
    id: 11, slug: 'sport-loisirs',
    name_fr: 'Sport et Loisir', name_ar: 'الرياضة والترفيه',
    icon: 'fa-running',
    subcategories: [
      { slug: 'equipements-fitness', name_fr: 'Équipements fitness & musculation', name_ar: 'معدات اللياقة والكمال' },
      { slug: 'terrains-sport',      name_fr: 'Terrains & complexes sportifs',     name_ar: 'ملاعب ومجمعات رياضية' },
      { slug: 'piscines-spa',        name_fr: 'Piscines & équipements aquatiques', name_ar: 'مسابح ومعدات مائية' },
      { slug: 'sports-extreme',      name_fr: 'Sports extrêmes & aventure',        name_ar: 'رياضات المغامرة' },
    ],
    filters: [
      { key: 'type_activite',  label_fr: 'Type d\'activité',   label_ar: 'نوع النشاط',     type: 'text'   },
      { key: 'marque',         label_fr: 'Marque',              label_ar: 'العلامة التجارية', type: 'text'   },
      { key: 'etat',           label_fr: 'État',                label_ar: 'الحالة',         type: 'select',
        options: ['Neuf','Très bon','Bon','Correct'] },
    ],
  },
  {
    id: 12, slug: 'beaute-esthetique-soins',
    name_fr: 'Beauté, Esthétique & Soins', name_ar: 'التجميل والعناية الشخصية',
    icon: 'fa-spa',
    subcategories: [
      { slug: 'coiffure-pro',      name_fr: 'Matériel de coiffure professionnel', name_ar: 'معدات الحلاقة المهنية' },
      { slug: 'manucure-pedicure', name_fr: 'Manucure, pédicure & onglerie',      name_ar: 'تجميل الأظافر' },
      { slug: 'epilation-laser',   name_fr: 'Épilation & soins au laser',        name_ar: 'إزالة الشعر والليزر' },
      { slug: 'spa-hammam',        name_fr: 'SPA, hammam & sauna',               name_ar: 'سبا وحمام وبخار' },
    ],
    filters: [
      { key: 'type_service',   label_fr: 'Type de service',     label_ar: 'نوع الخدمة',     type: 'text'   },
      { key: 'marque',         label_fr: 'Marque',              label_ar: 'العلامة التجارية', type: 'text'   },
      { key: 'etat',           label_fr: 'État',                label_ar: 'الحالة',         type: 'select',
        options: ['Neuf','Très bon','Bon','Correct'] },
    ],
  },
  {
    id: 13, slug: 'divers-equipement-pro',
    name_fr: 'Divers Équipement Professionnel', name_ar: 'معدات مهنية متنوعة',
    icon: 'fa-tools',
    subcategories: [
      { slug: 'outillage-pro',   name_fr: 'Outillage professionnel',     name_ar: 'أدوات مهنية' },
      { slug: 'manutention',     name_fr: 'Manutention & levage',        name_ar: 'مناولة ورفع' },
      { slug: 'nettoyage-pro',   name_fr: 'Nettoyage industriel',        name_ar: 'تنظيف صناعي' },
      { slug: 'securite-pro',    name_fr: 'Sécurité & EPI',              name_ar: 'أمن ووقاية' },
    ],
    filters: [
      { key: 'type_equipement', label_fr: 'Type d\'équipement',  label_ar: 'نوع المعدات',  type: 'text'   },
      { key: 'marque',          label_fr: 'Marque',              label_ar: 'العلامة التجارية', type: 'text'   },
      { key: 'etat',            label_fr: 'État',                label_ar: 'الحالة',         type: 'select',
        options: ['Neuf','Très bon','Bon','Correct'] },
    ],
  },
];

const SUBSCRIPTION_PACKS = {
  free: {
    name: 'Gratuit', max_listings: 3, features: ['3 annonces', 'Contact direct'], price: 0,
  },
  starter_pro: {
    name: 'Starter Pro', max_listings: 10,
    features: ['10 annonces', 'Badge professionnel', 'Contact direct'],
    price_dzd: 2500, price_eur: 18, duration_days: 30,
  },
  business_pro: {
    name: 'Business Pro', max_listings: 50,
    features: ['50 annonces', 'Statistiques avancées', 'Logo entreprise', 'Badge certifié'],
    price_dzd: 6500, price_eur: 45, duration_days: 30,
  },
  concessionnaire_elite: {
    name: 'Concessionnaire Élite', max_listings: -1,
    features: ['Annonces illimitées', 'Mini-site dédié (/store/votre-nom)', 'Priorité dans les résultats', 'Gestionnaire dédié'],
    price_dzd: 15000, price_eur: 105, duration_days: 30,
  },
};

const BOOST_TYPES = {
  top_list:      { name: 'Top de Liste',       duration_days: 7, price_dzd: 800,  price_eur: 6  },
  premium_badge: { name: 'Badge Premium Orange', duration_days: 30, price_dzd: 500, price_eur: 4 },
  carousel:      { name: 'Carrousel Accueil',  duration_days: 7, price_dzd: 1500, price_eur: 11 },
};

module.exports = { CATEGORIES, SUBSCRIPTION_PACKS, BOOST_TYPES };
