# Sessions Feature - Frontend

**Module**: Register Sessions UI  
**Features**: Open/close session, cash count  

---

## **SESSION CONTROLS**

```tsx
// components/sessions/SessionControls.tsx
export function SessionControls() {
  const { data: currentSession } = useCurrentSession();
  const { mutate: openSession } = useOpenSession();
  const { mutate: closeSession } = useCloseSession();

  if (!currentSession) {
    return (
      <Button onClick={() => openSession({ openingBalance: 0 })}>
        Open Session
      </Button>
    );
  }

  return (
    <div>
      <p>Session: {currentSession.sessionNumber}</p>
      <Button onClick={() => setShowCloseModal(true)}>Close Session</Button>
    </div>
  );
}
```
