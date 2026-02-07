import{c as e}from"./_plugin-vue_export-helper-C_eiSiqI.js";
/**
 * @license lucide-vue-next v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t=e("ShuffleIcon",[["path",{d:"M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22",key:"1wmou1"}],["path",{d:"m18 2 4 4-4 4",key:"pucp1d"}],["path",{d:"M2 6h1.9c1.5 0 2.9.9 3.6 2.2",key:"10bdb2"}],["path",{d:"M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8",key:"vgxac0"}],["path",{d:"m18 14 4 4-4 4",key:"10pe0f"}]]),r={"一室":"一","二室":"二","三室":"三","四室":"四","五室":"五","六室":"六","七室":"七","八室":"八","区域一室":"一","区域二室":"二","区域三室":"三","区域四室":"四","区域五室":"五","区域六室":"六","区域七室":"七","区域八室":"八","1室":"一","2室":"二","3室":"三","4室":"四","5室":"五","6室":"六","7室":"七","8室":"八","一科":"一","二科":"二","三科":"三","四科":"四","五科":"五","六科":"六","七科":"七","八科":"八","一":"一","二":"二","三":"三","四":"四","五":"五","六":"六","七":"七","八":"八"},c={"一":"区域一室","二":"区域二室","三":"区域三室","四":"区域四室","五":"区域五室","六":"区域六室","七":"区域七室","八":"区域八室"};function n(e){if(!e)return"";const t=e.trim();if(r[t])return r[t];const c=t.replace(/室$/g,"").replace(/科$/g,"").replace(/区域/g,"").trim(),n={1:"一",2:"二",3:"三",4:"四",5:"五",6:"六",7:"七",8:"八"};return n[c]?n[c]:r[c]?r[c]:c}function p(e){if(!e)return"";const t=n(e);return c[t]||"区域"+t+"室"}export{t as S,n as a,p as n};
