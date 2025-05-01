import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';

const apiBaseUrl = 'http://localhost:3000/api';

export default function App() {
  const [userType, setUserType] = useState(null); // 'landlord' or 'tenant'
  const [landlordId, setLandlordId] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [plotName, setPlotName] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [properties, setProperties] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Landlord login
  const landlordLogin = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/landlords/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotName, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Login Failed', data.error || 'Unknown error');
        return;
      }
      setUserType('landlord');
      setLandlordId(data.landlordId);
      loadLandlordData(data.landlordId);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Tenant login
  const tenantLogin = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/tenants/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenantName, phoneNumber: tenantPhone }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Login Failed', data.error || 'Unknown error');
        return;
      }
      setUserType('tenant');
      setTenant(data.tenant);
      loadTenantData(data.tenant);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Load landlord data
  const loadLandlordData = async (id) => {
    try {
      const propsRes = await fetch(`${apiBaseUrl}/landlords/${id}/properties`);
      const propsData = await propsRes.json();
      setProperties(propsData);

      const notifRes = await fetch(`${apiBaseUrl}/notifications/landlord/${id}`);
      const notifData = await notifRes.json();
      setNotifications(notifData);

      const maintRes = await fetch(`${apiBaseUrl}/landlords/${id}/maintenance-requests`);
      const maintData = await maintRes.json();
      setMaintenanceRequests(maintData);

      const docsRes = await fetch(`${apiBaseUrl}/documents/landlord/${id}`);
      const docsData = await docsRes.json();
      setDocuments(docsData);
    } catch (err) {
      Alert.alert('Error loading data', err.message);
    }
  };

  // Load tenant data
  const loadTenantData = async (tenant) => {
    try {
      const notifRes = await fetch(`${apiBaseUrl}/notifications/tenant/${tenant.id}`);
      const notifData = await notifRes.json();
      setNotifications(notifData);

      const maintRes = await fetch(`${apiBaseUrl}/landlords/${tenant.landlordId}/maintenance-requests`);
      const maintData = await maintRes.json();
      setMaintenanceRequests(maintData);

      const docsRes = await fetch(`${apiBaseUrl}/documents/tenant/${tenant.id}`);
      const docsData = await docsRes.json();
      setDocuments(docsData);

      const propsRes = await fetch(`${apiBaseUrl}/landlords/${tenant.landlordId}/properties`);
      const propsData = await propsRes.json();
      setProperties(propsData);
    } catch (err) {
      Alert.alert('Error loading data', err.message);
    }
  };

  // Submit maintenance request
  const submitMaintenanceRequest = async () => {
    if (!selectedPropertyId || !maintenanceDescription.trim()) {
      Alert.alert('Error', 'Please select a property and enter a description');
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/tenants/${tenant.id}/maintenance-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedPropertyId, description: maintenanceDescription }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit maintenance request');
      }
      Alert.alert('Success', 'Maintenance request submitted');
      setMaintenanceDescription('');
      loadTenantData(tenant);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Render functions for different views
  if (!userType) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Login</Text>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Landlord Login</Text>
        <TextInput placeholder="Plot Name" value={plotName} onChangeText={setPlotName} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
        <Button title="Login as Landlord" onPress={landlordLogin} />
        <View style={{ height: 20 }} />
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Tenant Login</Text>
        <TextInput placeholder="Name" value={tenantName} onChangeText={setTenantName} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
        <TextInput placeholder="Phone Number" value={tenantPhone} onChangeText={setTenantPhone} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
        <Button title="Login as Tenant" onPress={tenantLogin} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <ScrollView>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          {userType === 'landlord' ? 'Landlord Dashboard' : 'Tenant Dashboard'}
        </Text>

        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Notifications</Text>
        {notifications.length === 0 ? (
          <Text>No notifications</Text>
        ) : (
          notifications.map((notif) => (
            <Text key={notif.id} style={{ fontWeight: notif.isRead ? 'normal' : 'bold', marginBottom: 5 }}>
              {notif.message}
            </Text>
          ))
        )}

        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Properties</Text>
        {properties.length === 0 ? (
          <Text>No properties found</Text>
        ) : (
          properties.map((prop) => (
            <View key={prop.id} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>{prop.name}</Text>
              <Text>{prop.address}</Text>
              <Text>{prop.description}</Text>
            </View>
          ))
        )}

        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Maintenance Requests</Text>
        {maintenanceRequests.length === 0 ? (
          <Text>No maintenance requests</Text>
        ) : (
          maintenanceRequests.map((req) => (
            <View key={req.id} style={{ marginBottom: 10 }}>
              <Text><Text style={{ fontWeight: 'bold' }}>Property ID:</Text> {req.propertyId}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Description:</Text> {req.description}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Status:</Text> {req.status}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Requested On:</Text> {new Date(req.requestDate).toLocaleDateString()}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Resolved On:</Text> {req.resolutionDate ? new Date(req.resolutionDate).toLocaleDateString() : 'N/A'}</Text>
            </View>
          ))
        )}

        {userType === 'tenant' && (
          <>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Submit Maintenance Request</Text>
            <View>
              <Text>Property:</Text>
              {properties.length === 0 ? (
                <Text>No properties available</Text>
              ) : (
                properties.map((prop) => (
                  <TouchableOpacity key={prop.id} onPress={() => setSelectedPropertyId(prop.id)} style={{ padding: 5, backgroundColor: selectedPropertyId === prop.id ? '#ddd' : '#fff' }}>
                    <Text>{prop.name}</Text>
                  </TouchableOpacity>
                ))
              )}
              <TextInput
                placeholder="Description"
                value={maintenanceDescription}
                onChangeText={setMaintenanceDescription}
                multiline
                style={{ borderWidth: 1, padding: 8, marginTop: 5, height: 80 }}
              />
              <Button title="Submit Request" onPress={submitMaintenanceRequest} />
            </View>
          </>
        )}

        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Documents</Text>
        {documents.length === 0 ? (
          <Text>No documents found</Text>
        ) : (
          documents.map((doc) => (
            <View key={doc.id} style={{ marginBottom: 10 }}>
              <Text>{doc.fileName}</Text>
              {/* Download and delete functionality can be added here */}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
