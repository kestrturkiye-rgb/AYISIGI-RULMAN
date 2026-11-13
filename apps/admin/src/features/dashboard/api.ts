import {dashboardSchema,type DashboardPeriod} from '@rt/contracts';
import {client} from '../../lib/config';
export async function loadDashboard(period:DashboardPeriod){
  if(!client)throw Error('Proje bağlantısı tanımlanmadı.');
  const {data,error}=await client.rpc('get_admin_dashboard',{p_period:period});
  if(error)throw Error('Panel verileri alınamadı. Bağlantınızı kontrol edip tekrar deneyin.');
  const parsed=dashboardSchema.safeParse(data);
  if(!parsed.success)throw Error('Panel verisi doğrulanamadı. Yeniden deneyin.');
  return parsed.data;
}
