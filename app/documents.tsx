import React, { useEffect, useState } from 'react';
import {
    Button,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    downloadDocumentFile,
    deleteDocument,
    fetchPreviewBase64,
    listDocuments,
    uploadDocument,
} from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

interface DocumentItem {
    key: string;
    fileName: string;
    mimeType?: string;
    category: string;
}

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'folder-open' },
    { id: 'insurance', label: 'Insurance', icon: 'shield-checkmark' },
    { id: 'medical', label: 'Medical', icon: 'medkit' },
    { id: 'property', label: 'Property', icon: 'home' },
    { id: 'id', label: 'IDs', icon: 'card' },
];

const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all');

export default function DocumentsScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [uploadCategory, setUploadCategory] = useState('insurance');
    const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [previewUris, setPreviewUris] = useState<Record<string, string>>({});
    const [documents, setDocuments] = useState<DocumentItem[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const docs = await listDocuments();
                setDocuments(docs);

                const imageDocs = docs.filter((d) => d.mimeType?.startsWith('image/'));
                for (const doc of imageDocs) {
                    try {
                        const uri = await fetchPreviewBase64(doc.key);
                        setPreviewUris((prev) => ({ ...prev, [doc.key]: uri }));
                    } catch (e) {
                        console.log('Preview failed for', doc.key, e);
                    }
                }
            } catch (e) {
                console.log('Failed to load documents:', e);
            }
        })();
    }, []);

    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (!result.canceled) {
            setFile(result.assets[0]);
        }
        setModalVisible(false);
    };

    const handleUpload = async () => {
        if (!file) return;
        try {
            const data = await uploadDocument(file, uploadCategory);

            const newDoc: DocumentItem = {
                key: data.key,
                fileName: data.fileName,
                mimeType: file.mimeType,
                category: uploadCategory,
            };

            setDocuments((prev) => [...prev, newDoc]);

            if (newDoc.mimeType?.startsWith('image/')) {
                try {
                    const uri = await fetchPreviewBase64(data.key);
                    setPreviewUris((prev) => ({ ...prev, [data.key]: uri }));
                } catch (e) {
                    console.log('Preview failed for uploaded doc:', e);
                }
            }

            setFile(null);
        } catch (e) {
            console.log(e);
        }
    };


    const handleDelete = async (key: string) => {
        try {
            await deleteDocument(key);
            setDocuments((prev) => prev.filter((d) => d.key !== key));
            setPreviewUris((prev) => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
            });
        } catch (e) {
            console.log('Delete failed:', e);
        }
    };

    const filteredDocuments =
        selectedCategory === 'all'
            ? documents
            : documents.filter((d) => d.category === selectedCategory);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Document Vault</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Security Banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="lock-closed" size={18} color="#22c55e" />
                <Text style={styles.infoText}>
                    Documents are encrypted before upload
                </Text>
            </View>

            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoryChip,
                            selectedCategory === cat.id && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                    >
                        <Ionicons
                            name={cat.icon as any}
                            size={16}
                            color={selectedCategory === cat.id ? '#fff' : '#9ca3af'}
                        />
                        <Text
                            style={[
                                styles.categoryLabel,
                                selectedCategory === cat.id && styles.categoryLabelActive,
                            ]}
                        >
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {/* Upload Preview */}
                {file && (
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Ready to Upload</Text>
                        <Text style={styles.fileName}>{file.name}</Text>

                        {file.mimeType?.startsWith('image/') && (
                            <Image source={{ uri: file.uri }} style={styles.previewImage} />
                        )}

                        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
                            <Ionicons name="cloud-upload" size={18} color="#fff" />
                            <Text style={styles.btnText}>Upload</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Documents */}
                {filteredDocuments.map((doc) => (
                    <View key={doc.key} style={styles.docCard}>
                        <View style={styles.docHeader}>
                            <View style={styles.docIcon}>
                                <Ionicons
                                    name={doc.mimeType?.startsWith('image/') ? 'image' : 'document-text'}
                                    size={24}
                                    color="#fff"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.docName}>{doc.fileName}</Text>
                                <Text style={styles.docCategory}>{doc.category}</Text>
                            </View>
                        </View>

                        {/* Preview */}
                        {doc.mimeType?.startsWith('image/') ? (
                            previewUris[doc.key] ? (
                                <Image source={{ uri: previewUris[doc.key] }} style={styles.documentPreview} />
                            ) : (
                                <View style={styles.pdfPreview}>
                                    <Ionicons name="image-outline" size={48} color="#6b7280" />
                                    <Text style={{ color: '#9ca3af', marginTop: 10 }}>Loading preview...</Text>
                                </View>
                            )
                        ) : (
                            <View style={styles.pdfPreview}>
                                <Ionicons name="document" size={48} color="#ef4444" />
                                <Text style={{ color: '#9ca3af', marginTop: 10 }}>PDF Preview</Text>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity
                                style={[styles.downloadBtn, { flex: 1, marginTop: 0 }]}
                                onPress={() => downloadDocumentFile(doc.key, doc.fileName)}
                            >
                                <Ionicons name="download" size={18} color="#fff" />
                                <Text style={styles.btnText}>Download</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDelete(doc.key)}
                            >
                                <Ionicons name="trash" size={18} color="#fff" />
                                <Text style={styles.btnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {/* Empty */}
                {filteredDocuments.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open-outline" size={64} color="#6b7280" />
                        <Text style={styles.emptyTitle}>No Documents</Text>
                        <Text style={styles.emptySubtitle}>
                            Upload secure documents to access them anytime
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Upload Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Upload Image or PDF</Text>
                        <Text style={{ color: '#6b7280', marginBottom: 10 }}>Category</Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {UPLOAD_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        uploadCategory === cat.id && styles.categoryChipActive,
                                    ]}
                                    onPress={() => setUploadCategory(cat.id)}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={14}
                                        color={uploadCategory === cat.id ? '#fff' : '#9ca3af'}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryLabel,
                                            uploadCategory === cat.id && styles.categoryLabelActive,
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Button title="Choose File" onPress={pickFile} />

                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={{ marginTop: 20 }}
                        >
                            <Text style={{ textAlign: 'center' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    addButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(34,197,94,0.15)',
        gap: 10,
    },
    infoText: {
        color: '#86efac',
        flex: 1,
    },
    categoryScroll: {
        marginTop: 20,
        maxHeight: 50,
    },
    categoryContainer: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    categoryChipActive: {
        backgroundColor: '#2563eb',
    },
    categoryLabel: {
        color: '#9ca3af',
    },
    categoryLabelActive: {
        color: '#fff',
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        gap: 16,
    },
    previewCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
    },
    previewTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    fileName: {
        color: '#9ca3af',
        marginTop: 8,
    },
    previewImage: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        marginTop: 16,
    },
    uploadBtn: {
        backgroundColor: '#16a34a',
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    downloadBtn: {
        backgroundColor: '#9333ea',
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    btnText: {
        color: '#fff',
        fontWeight: '700',
    },
    docCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
    },
    docHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    docIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    docName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    docCategory: {
        color: '#9ca3af',
        marginTop: 4,
    },
    documentPreview: {
        width: '100%',
        height: 240,
        borderRadius: 12,
    },
    pdfPreview: {
        height: 220,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginTop: 20,
    },
    emptySubtitle: {
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    deleteBtn: {
        backgroundColor: '#dc2626',
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    modalBg: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modal: {
        width: 320,
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },
});
