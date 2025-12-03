import AddressCard from './AddressCard';

export default function AddressList({ 
  addresses, 
  onEdit, 
  onDelete, 
  onSetDefault, 
  loading = false 
}) {
  // 確保 addresses 是陣列
  const addressesArray = Array.isArray(addresses) ? addresses : [];
  
  if (addressesArray.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '3rem', 
        color: '#666',
        fontSize: '1.1rem'
      }}>
        目前沒有地址，請新增您的第一個地址
      </div>
    );
  }

  return (
    <div>
      {addressesArray.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          addresses={addressesArray}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
          loading={loading}
        />
      ))}
    </div>
  );
}
