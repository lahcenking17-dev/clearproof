export function seedCase() {
  return {
    title: 'A website handover, without the ambiguity',
    client: 'Northstar Studio',
    freelancer: 'Mina — independent web designer',
    currency: 'USD',
    fixture: true,
    scope: 'Three separately payable milestones. The client reviews the supporting evidence for each milestone before authorizing its payment. Repository access and accessibility checks remain separate deliverables. No escrow or legal certification is provided.',
    milestones: [
      { id: 'M1', title: 'Responsive landing page', criterion: 'Deliver a responsive landing page with desktop and mobile layouts.', cents: 15000 },
      { id: 'M2', title: 'Editable source handover', criterion: 'Deliver the editable source files and grant the client access to the source code repository.', cents: 20000 },
      { id: 'M3', title: 'Accessibility review', criterion: 'Complete an accessibility review covering keyboard navigation and image alternative text.', cents: 10000 }
    ],
    evidence: [
      { id: 'E1', title: 'Design delivery note', kind: 'Delivery record', author: 'Mina', text: 'The responsive landing page is ready for review. Desktop and mobile layouts are included in the delivery package. The layout adapts to narrow screens. This delivery covers the landing page milestone only.', recordedAt: '2026-10-18T09:00:00.000Z' },
      { id: 'E2', title: 'Repository handover message', kind: 'Message', author: 'Mina', text: 'The editable source files and source code repository access have not been delivered yet. Repository access is still pending. Please do not mark the source handover as complete.', recordedAt: '2026-10-18T09:10:00.000Z' },
      { id: 'E3', title: 'Accessibility status', kind: 'Review note', author: 'Mina', text: 'The accessibility review is not complete. Keyboard navigation has an unresolved issue. Image alternative text checks are still pending. The review will be delivered in a later milestone.', recordedAt: '2026-10-18T09:20:00.000Z' },
      { id: 'E4', title: 'Client layout feedback', kind: 'Client message', author: 'Northstar Studio', text: 'I reviewed the desktop and mobile landing page layouts. Both display correctly and the responsive design looks good. I have not reviewed the repository access or accessibility deliverables.', recordedAt: '2026-10-18T10:00:00.000Z' }
    ]
  };
}
