import {z} from 'zod';
export const stateSchema=z.enum(['draft','published']);
const slug=z.string().trim().min(1,'Adres adı gerekli.').max(300).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/,'Küçük harf, rakam ve tire kullanın.');
const id=z.string().min(1).max(160);
const positive=z.number().positive('Sıfırdan büyük olmalı.').nullable();
export const specSchema=z.object({name:z.string().trim().min(1,'Özellik adı gerekli.').max(160),value:z.union([z.string().max(4000),z.number(),z.boolean()]),unit:z.string().max(40).nullable().optional()});
export const mediaSchema=z.object({media_id:id,alt_text:z.string().max(500).default(''),is_primary:z.boolean().default(false),mime_type:z.string(),external_url:z.string().url().nullable().optional(),bucket_id:z.enum(['media-originals','media-published']),object_path:z.string(),status:stateSchema});
export const productSchema=z.object({
 id:id.optional(),lock_version:z.number().int().nonnegative().default(0),
 sku:z.string().trim().min(1,'Ürün kodu gerekli.').max(240),name:z.string().trim().min(1,'Ürün adı gerekli.').max(500),slug,
 brand_id:id.nullable(),category_id:z.string().min(1,'Kategori seçin.'),
 short_description:z.string().max(4000),long_description:z.record(z.string(),z.unknown()),origin:z.string().max(160).nullable(),
 stock_status:z.enum(['in_stock','on_order','out_of_stock']),featured:z.boolean(),is_new:z.boolean(),sort_order:z.number().int().min(-2147483648).max(2147483647),
 inner_mm:positive,outer_mm:positive,width_mm:positive,specifications:z.array(specSchema).max(100),base_code:z.string().max(240).nullable(),manufacturer_code:z.string().max(240).nullable(),technical_warning:z.string().max(4000).nullable(),
 price_mode:z.enum(['quote','hidden','visible']),price:z.object({amount:z.number().nonnegative(),currency:z.string().regex(/^[A-Z]{3}$/)}).nullable(),
 inventory:z.object({quantity:z.number().nonnegative().nullable(),low_threshold:z.number().nonnegative().nullable()}).nullable(),
 seo:z.object({title:z.string().max(180).optional(),description:z.string().max(500).optional(),image_id:z.string().nullable().optional()}),status:stateSchema,
 aliases:z.array(z.object({code:z.string().trim().min(1,'Kod gerekli.').max(240),brand_id:id.nullable(),kind:z.enum(['base','manufacturer','reference'])})).max(100),
 media:z.array(mediaSchema).max(30),relations:z.array(z.object({related_id:id,kind:z.enum(['alternative','variant']),name:z.string().optional(),sku:z.string().optional()})).max(100),
}).superRefine((p,c)=>{
 if(p.inner_mm!==null&&p.outer_mm!==null&&p.inner_mm>=p.outer_mm)c.addIssue({code:'custom',path:['outer_mm'],message:'Dış çap iç çaptan büyük olmalı.'});
 if(p.media.filter(m=>m.is_primary).length>1)c.addIssue({code:'custom',path:['media'],message:'Yalnızca bir ana görsel seçin.'});
 if(p.media.some(m=>m.is_primary&&m.mime_type==='application/pdf'))c.addIssue({code:'custom',path:['media'],message:'PDF ana görsel olamaz.'});
 const unique=(a:string[])=>new Set(a).size===a.length;
 if(!unique(p.aliases.map(a=>a.kind+':'+a.code)))c.addIssue({code:'custom',path:['aliases'],message:'Aynı türde eşdeğer kod tekrarlanamaz.'});
 if(!unique(p.media.map(m=>m.media_id)))c.addIssue({code:'custom',path:['media'],message:'Aynı dosya iki kez eklenemez.'});
 if(!unique(p.relations.map(r=>r.kind+':'+r.related_id))||p.relations.some(r=>r.related_id===p.id))c.addIssue({code:'custom',path:['relations'],message:'İlişkili ürünler tekrarlanamaz; ürün kendisiyle eşleştirilemez.'});
});
export type Product=z.infer<typeof productSchema>;
export type ProductInput=z.input<typeof productSchema>;
export type Media=z.infer<typeof mediaSchema>;
export const emptyProduct:Product={lock_version:0,sku:'',name:'',slug:'',brand_id:null,category_id:'',short_description:'',long_description:{type:'doc',content:[]},origin:null,stock_status:'on_order',featured:false,is_new:false,sort_order:0,inner_mm:null,outer_mm:null,width_mm:null,specifications:[],base_code:null,manufacturer_code:null,technical_warning:null,price_mode:'quote',price:null,inventory:{quantity:null,low_threshold:null},seo:{title:'',description:'',image_id:null},status:'draft',aliases:[],media:[],relations:[]};
export function slugify(value:string){return value.toLocaleLowerCase('tr').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,280).replace(/-$/,'');}
export const bearingTemplate=[['Rulman tipi',''],['Kapak / sızdırmazlık',''],['Kafes',''],['Ağırlık','kg'],['Dinamik yük (C)','kN'],['Statik yük (C0)','kN'],['Limit devir','dev/dk'],['Standart','']].map(([name,unit])=>({name,value:'',unit}));
export const taxonomySchema=z.object({id:id.optional(),lock_version:z.number().int().nonnegative(),name:z.string().trim().min(1,'Ad gerekli.').max(160),slug,description:z.string().max(12000),parent_id:id.nullable().optional(),image_id:id.nullable().optional(),logo_id:id.nullable().optional(),sort_order:z.number().int(),status:stateSchema,deleted_at:z.string().nullable().optional(),seo:z.object({title:z.string().max(180).optional(),description:z.string().max(500).optional()}).optional(),template_fields:z.array(specSchema).max(100).optional()});
export type Taxonomy=z.infer<typeof taxonomySchema>;
export const lookupsSchema=z.object({categories:z.array(taxonomySchema),brands:z.array(taxonomySchema),templates:z.array(z.object({id:z.string(),name:z.string(),category_id:z.string().nullable(),fields:z.array(specSchema)}))});
export type Lookups=z.infer<typeof lookupsSchema>;
export const catalogListSchema=z.object({total:z.number().int().nonnegative(),items:z.array(z.object({id,sku:z.string(),name:z.string(),slug:z.string(),brand_id:id.nullable(),category_id:id,brand:z.string().nullable(),category:z.string(),status:stateSchema,stock_status:z.string(),deleted_at:z.string().nullable(),lock_version:z.number().int(),inner_mm:z.number().nullable(),outer_mm:z.number().nullable(),width_mm:z.number().nullable(),sort_order:z.number().int(),updated_at:z.string()})).max(100)});
export type CatalogList=z.infer<typeof catalogListSchema>;
// Personal drafts preserve incomplete/invalid fields. Publication always uses productSchema instead.
export const productDraftSchema=z.object({...productSchema.shape,
 sku:z.string().max(240),name:z.string().max(500),slug:z.string().max(300),category_id:z.string().max(160),sort_order:z.number().nullable(),
 inner_mm:z.number().nullable(),outer_mm:z.number().nullable(),width_mm:z.number().nullable(),
 specifications:z.array(specSchema.extend({name:z.string().max(160)})).max(100),
 aliases:z.array(z.object({code:z.string().max(240),brand_id:id.nullable(),kind:z.enum(['base','manufacturer','reference'])})).max(100),
 inventory:z.object({quantity:z.number().nullable().default(null),low_threshold:z.number().nullable().default(null)}).nullable(),
 price:z.object({amount:z.number().nullable(),currency:z.string().max(3)}).nullable(),
});
