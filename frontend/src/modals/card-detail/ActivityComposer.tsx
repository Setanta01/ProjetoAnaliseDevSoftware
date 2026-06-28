import { AtSign, Paperclip, Plus } from 'lucide-react'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProjectMember } from '@/types'
import type { ActivityTab } from './types'

export function ActivityComposer({ tab, cardId, currentUserName, members, comment, newItem, mentionedUserIds, commentAttachments, onCommentChange, onNewItemChange, onMentionedUserIdsChange, onAttachmentsChange, onSubmit }: { tab: ActivityTab; cardId: number | null; currentUserName: string; members: ProjectMember[]; comment: string; newItem: string; mentionedUserIds: number[]; commentAttachments: File[]; onCommentChange: (value: string) => void; onNewItemChange: (value: string) => void; onMentionedUserIdsChange: React.Dispatch<React.SetStateAction<number[]>>; onAttachmentsChange: React.Dispatch<React.SetStateAction<File[]>>; onSubmit: () => void }) {
  const addMention = (memberId: string) => {
    const id = Number(memberId)
    if (id && !mentionedUserIds.includes(id)) onMentionedUserIdsChange((current) => [...current, id])
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex gap-3">
        <UserAvatar name={currentUserName} className="h-9 w-9" />
        <div className="flex-1 overflow-hidden rounded-xl border border-input bg-card">
          <Textarea className="min-h-20 resize-none border-0 shadow-none focus-visible:ring-0" value={tab === 'comments' ? comment : newItem} onChange={(event) => tab === 'comments' ? onCommentChange(event.target.value) : onNewItemChange(event.target.value)} placeholder={tab === 'comments' ? 'Adicionar um comentário...' : 'Adicionar novo item ao checklist...'} />
          {tab === 'comments' && (mentionedUserIds.length > 0 || commentAttachments.length > 0) && (
            <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {mentionedUserIds.map((id) => {
                const member = members.find((item) => item.id === id)
                return <button key={id} type="button" className="rounded-md bg-secondary px-2 py-1 hover:bg-secondary/80" onClick={() => onMentionedUserIdsChange((current) => current.filter((item) => item !== id))}>@{member?.nome ?? id}</button>
              })}
              {commentAttachments.map((file) => <button key={`${file.name}-${file.size}`} type="button" className="rounded-md bg-secondary px-2 py-1 hover:bg-secondary/80" onClick={() => onAttachmentsChange((current) => current.filter((item) => item !== file))}>{file.name}</button>)}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border bg-muted px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              {tab === 'comments' ? (
                <>
                  <Select className="h-8 w-40 bg-card" value="" onChange={(event) => addMention(event.target.value)} aria-label="Mencionar usuário">
                    <option value="">@ Mencionar</option>
                    {members.filter((member) => !mentionedUserIds.includes(member.id)).map((member) => <option key={member.id} value={member.id}>{member.nome}</option>)}
                  </Select>
                  <input id={`comment-attachments-${cardId ?? 'new'}`} className="sr-only" type="file" multiple accept="image/*,video/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { if (event.target.files?.length) onAttachmentsChange((current) => [...current, ...Array.from(event.target.files ?? [])]) }} />
                  <Button type="button" variant="ghost" size="sm" asChild><label htmlFor={`comment-attachments-${cardId ?? 'new'}`}><Paperclip className="h-4 w-4" /> Anexar</label></Button>
                </>
              ) : (
                <>
                  <AtSign className="h-4 w-4" />
                  <Paperclip className="h-4 w-4" />
                </>
              )}
            </div>
            <Button size="sm" onClick={onSubmit}>{tab === 'comments' ? 'Salvar' : <><Plus className="h-4 w-4" /> Adicionar</>}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
