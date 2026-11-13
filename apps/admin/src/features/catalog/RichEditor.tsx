import {useEffect} from 'react';
import {EditorContent,useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
export function RichEditor({value,onChange,disabled}:{value:Record<string,unknown>,onChange:(v:Record<string,unknown>)=>void,disabled:boolean}){
 const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[2,3,4]},link:{openOnClick:false,protocols:['https','mailto'],HTMLAttributes:{rel:'noopener noreferrer'}}})],content:value,editable:!disabled,editorProps:{attributes:{'aria-label':'Uzun açıklama','role':'textbox','aria-multiline':'true'}},onUpdate:({editor})=>onChange(editor.getJSON())});
 useEffect(()=>{if(editor&&JSON.stringify(editor.getJSON())!==JSON.stringify(value))editor.commands.setContent(value,{emitUpdate:false});},[editor,value]);
 useEffect(()=>{editor?.setEditable(!disabled);},[editor,disabled]);
 return <div className="rich-editor"><div className="editor-toolbar" role="toolbar" aria-label="Metin biçimlendirme">
 {[['Kalın',()=>editor?.chain().focus().toggleBold().run()],['İtalik',()=>editor?.chain().focus().toggleItalic().run()],['Başlık',()=>editor?.chain().focus().toggleHeading({level:2}).run()],['Madde listesi',()=>editor?.chain().focus().toggleBulletList().run()],['Numaralı liste',()=>editor?.chain().focus().toggleOrderedList().run()],['Alıntı',()=>editor?.chain().focus().toggleBlockquote().run()],['Geri al',()=>editor?.chain().focus().undo().run()]].map(([label,action])=><button type="button" key={String(label)} disabled={disabled||!editor} onClick={action as ()=>void}>{String(label)}</button>)}
 <button type="button" disabled={disabled||!editor} onClick={()=>{const link=window.prompt('Bağlantı adresi (https://…)','https://');if(!link)return;if(/^https:\/\//i.test(link))editor?.chain().focus().setLink({href:link}).run();else window.alert('https:// ile başlayan bir adres girin.');}}>Bağlantı</button><button type="button" disabled={disabled||!editor} onClick={()=>editor?.chain().focus().unsetLink().run()}>Bağlantıyı kaldır</button></div><EditorContent editor={editor}/></div>;
}
